// dattago-pagamentos.ts — importação da API Pagamentos (GetOrdempaPamento)
//
// Port de assets/js/services/dattago-pagamentos.js (V3 — Service Layer).
//
// Estrutura da resposta:
//   $type, IdOrdemPagamento (int, único global), IdNotaEmpenho (int — referencia
//   empenho.Id, usado como fallback no join de Tipo), Orgao (string — presente
//   no item), DataOrdemPagamento (DD/MM/YYYY), CpfCnpjCredor (dígitos sem máscara),
//   NomeCredor, Historico (text livre — sanitizado, texto preservado), ValorDocumento/ValorRetencao/
//   ValorLiquido (number JS, não precisam de conversão pt-BR), PossuiAnulacao
//   (boolean), MotivoAnulacao (string — sanitizado, texto preservado).
//
// NÃO possui TotalRegistros; sem detecção de incompletude.
// Parâmetro: { ano } — sem idOrgao; Orgao vem de cada item da resposta.
//
// Estratégia: fetchAllPages — requisição única com paginação automática
// (pagina=2,3,… a partir da 2ª tentativa). Para quando página retorna 0 itens novos.

import {
  CONCURRENCY, str, normDate, fMoney,
  fetchAllPages, concurrentPool, calcCompleteness, retryLoop,
  writeCache, readCache, cacheKey,
  isOrgaoBloqueado, ImportLog,
} from './dattago-core';
import type { PgtoRow } from '@/lib/compute';
import type {
  Orgao, OnOrgaoCallback, OnOrgaoRef, ProgressCallback, TaskResult, AsyncTask,
} from './dattago-core';
import type { DattagoApiResult } from './dattago-empenhos';

const DUMMY_ORGAO: Orgao = { id: 0, nome: 'Todos os órgãos' };

/** Forma bruta de um item da API GetOrdempaPamento (após parse JSON). */
interface RawPagamento {
  IdOrdemPagamento?:    number | string | null;
  Id?:                  number | string | null;
  id?:                  number | string | null;
  IdNotaEmpenho?:       number | string | null;
  Orgao?:               string | null;
  DataOrdemPagamento?:  string | null;
  CpfCnpjCredor?:       string | null;
  NomeCredor?:          string | null;
  ValorDocumento?:      string | number | null;
  ValorRetencao?:       string | number | null;
  ValorLiquido?:        string | number | null;
  PossuiAnulacao?:      boolean | null;
  MotivoAnulacao?:      string | null;
  Historico?:           string | null;
  NumeroEmpenho?:       string | null;
  NumeroNotaEmpenho?:   string | null;
  Empenho?:             string | null;
}

function pgtoKey(item: RawPagamento): string {
  const id = str(item.IdOrdemPagamento ?? item.Id ?? item.id ?? '');
  return id || `${str(item.NomeCredor)}|${normDate(item.DataOrdemPagamento)}|${item.ValorDocumento}`;
}

function mapPagamento(item: RawPagamento): PgtoRow {
  return [
    normDate(item.DataOrdemPagamento),                        // [0]  Data OP
    str(item.Orgao),                                          // [1]  Órgão (presente no item)
    str(item.NomeCredor),                                     // [2]  Credor
    str(item.CpfCnpjCredor),                                  // [3]  CPF/CNPJ (dígitos sem máscara)
    item.IdOrdemPagamento != null ? Number(item.IdOrdemPagamento) : 0, // [4] Id OP
    item.IdNotaEmpenho    != null ? Number(item.IdNotaEmpenho)    : 0, // [5] Id Empenho (join fallback)
    fMoney(item.ValorDocumento),                              // [6]  Vl. Documento (number nativo)
    fMoney(item.ValorRetencao),                               // [7]  Vl. Retenção
    fMoney(item.ValorLiquido),                                // [8]  Vl. Líquido
    item.PossuiAnulacao ? 'Sim' : 'Nao',                      // [9]  Anulado
    str(item.MotivoAnulacao),                                 // [10] Motivo Anulação (sanitizado — texto preservado)
    str(item.Historico),                                      // [11] Histórico (sanitizado — texto preservado)
    str(item.NumeroEmpenho ?? item.NumeroNotaEmpenho ?? item.Empenho ?? ''), // [12] Nº Empenho
    // [13] Tipo — preenchido em Fase 2 (enrichPgtoRows) após todos os empRows
  ];
}

export async function getPagamentos(
  ano: number,
  onProgress?: ProgressCallback,
  onOrgao?: OnOrgaoCallback,
): Promise<DattagoApiResult<PgtoRow>> {
  const key    = cacheKey('pgto', { ano });
  const cached = readCache<PgtoRow[]>(key);
  if (cached) {
    onOrgao?.({ api: 'pgto', fromCache: true, count: cached.length });
    return { rows: cached, completeness: 1.0, taskCount: 0, log: null };
  }

  const log     = new ImportLog('Pagamentos', 'GetOrdempaPamento');
  log.dateRange = String(ano);
  log.taskCount = 1;

  const rawByTask: Array<TaskResult<RawPagamento> | null> = [null];
  const onOrgaoRef: OnOrgaoRef = { current: onOrgao };

  const tasks: AsyncTask[] = [async () => {
    const cap: { code?: number; reason?: string } = {};
    const result = await fetchAllPages<RawPagamento>(
      'GetOrdempaPamento', { ano },
      pgtoKey, 'Pagamentos', onProgress, cap,
    );

    if (result.permanent) {
      rawByTask[0] = { items: [], failed: true, permanent: true };
      onOrgaoRef.current?.({ api: 'pgto', monthLabel: null, orgao: DUMMY_ORGAO, orgaoIdx: 0, count: 0, error: true, errorCode: cap.code, errorReason: cap.reason });
      return;
    }
    if (result.failed) {
      rawByTask[0] = { items: [], failed: true, permanent: false };
      onOrgaoRef.current?.({ api: 'pgto', monthLabel: null, orgao: DUMMY_ORGAO, orgaoIdx: 0, count: 0, error: true, errorCode: cap.code, errorReason: cap.reason });
      return;
    }

    rawByTask[0] = { items: result.items, failed: false };
    onOrgaoRef.current?.({
      api: 'pgto', monthLabel: null, orgao: DUMMY_ORGAO,
      orgaoIdx: 0, count: result.items.length, error: false,
    });
  }];

  await concurrentPool(tasks, CONCURRENCY);
  await retryLoop(rawByTask, tasks, 'Pagamentos', onProgress, onOrgaoRef, log);

  // Items já deduplicados dentro de fetchAllPages; órgãos bloqueados excluídos.
  const rows: PgtoRow[] = (rawByTask[0]?.items ?? []).map(mapPagamento).filter(r => !isOrgaoBloqueado(r[1]));

  log.rawCount      = rawByTask[0]?.items?.length ?? 0;
  log.tasksFailed   = rawByTask[0]?.permanent === true ? 1 : 0;
  log.importedCount = rows.length;
  const completeness = calcCompleteness(rawByTask);
  log.finish(completeness);

  if (completeness >= 1.0) {
    writeCache(key, rows, { completeness, taskCount: log.taskCount, rowCount: rows.length });
  }
  return { rows, completeness, taskCount: log.taskCount, log };
}
