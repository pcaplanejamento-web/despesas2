// dattago-empenhos.ts — importação da API Empenhos (getempenhos)
//
// Port de assets/js/services/dattago-empenhos.js (V3 — Service Layer).
//
// Estrutura da resposta:
//   $type, Id (int, único global), Numero (string), Data (DD/MM/YYYY),
//   Fornecedor, ValorEmpenhado/Anulacao/Liquidado/Pago/SaldoPagar (string pt-BR),
//   FonteRecurso, DestinacaoRecurso, OrgaoGestor, UnidadeOrcamentaria, Funcao,
//   SubFuncao, Programa, Acao, CpfCnpjCredor, LicitacaoModalidade,
//   IdLicitacaoDispensaAdesao, Historico (sanitizado — texto preservado),
//   Elemento, SubElemento, TotalRegistros (int — total global da consulta)
//
// Estratégia:
//   Fase 1 — fetchAllPages: requisição única + paginação automática (pagina=1,2,…)
//            → para quando página retorna 0 itens novos ou allItems >= TotalRegistros.
//   Fase 2 — fallback mensal: se items < TotalRegistros após fase 1, busca mês a mês
//            em paralelo (FALLBACK_CONCURRENCY) e mescla com dedup.
//            Empenhos recuperados nesta fase são identificados pelo Numero+OrgaoGestor
//            e ficam disponíveis em log.recoveredItems.
// Órgão vem de item.OrgaoGestor (não filtrado por idOrgao).

import {
  CONCURRENCY, monthlyChunks, normDate, fMoney, str,
  fetchAllPages, concurrentPool, calcCompleteness, retryLoop,
  writeCache, readCache, cacheKey,
  isOrgaoBloqueado, ImportLog,
} from './dattago-core';
import type {
  EmpRow,
} from '@/lib/compute';
import type {
  Orgao, OnOrgaoCallback, OnOrgaoRef, ProgressCallback, TaskResult, AsyncTask,
} from './dattago-core';

const FALLBACK_CONCURRENCY = 3;
const DUMMY_ORGAO: Orgao = { id: 0, nome: 'Todos os órgãos' };

/** Forma bruta de um item da API getempenhos (após parse JSON). */
interface RawEmpenho {
  Id?:                       number | string | null;
  id?:                       number | string | null;
  Numero?:                   string | null;
  Data?:                     string | null;
  OrgaoGestor?:              string | null;
  UnidadeOrcamentaria?:      string | null;
  Fornecedor?:               string | null;
  CpfCnpjCredor?:            string | null;
  LicitacaoModalidade?:      string | null;
  IdLicitacaoDispensaAdesao?: string | null;
  Funcao?:                   string | null;
  SubFuncao?:                string | null;
  Programa?:                 string | null;
  Acao?:                     string | null;
  Elemento?:                 string | null;
  SubElemento?:              string | null;
  FonteRecurso?:             string | null;
  ValorEmpenhado?:           string | number | null;
  ValorAnulacao?:            string | number | null;
  ValorLiquidado?:           string | number | null;
  ValorPago?:                string | number | null;
  SaldoPagar?:               string | number | null;
  Historico?:                string | null;
  TotalRegistros?:           number | string | null;
}

export interface DattagoApiResult<TRow = EmpRow> {
  rows:         TRow[];
  completeness: number;
  taskCount:    number;
  log:          ImportLog | null;
}

function empKey(item: RawEmpenho): string {
  const id = str(item.Id ?? item.id ?? '');
  return id || `${str(item.Numero)}|${normDate(item.Data)}`;
}

function mapEmpenho(item: RawEmpenho): EmpRow {
  return [
    normDate(item.Data),                       // [0]  Data
    str(item.OrgaoGestor),                     // [1]  Órgão
    str(item.UnidadeOrcamentaria),             // [2]  Unid. Orçamentária
    str(item.Fornecedor),                      // [3]  Fornecedor
    str(item.CpfCnpjCredor),                   // [4]  CPF/CNPJ
    str(item.Numero),                          // [5]  Nº Empenho (join key para Pgto/Liq)
    str(item.LicitacaoModalidade),             // [6]  Modalidade Licit.
    str(item.IdLicitacaoDispensaAdesao),       // [7]  Nº Licitação
    str(item.Funcao),                          // [8]  Função
    str(item.SubFuncao),                       // [9]  Subfunção
    str(item.Programa),                        // [10] Programa
    str(item.Acao),                            // [11] Ação
    str(item.Elemento),                        // [12] Elemento
    str(item.SubElemento),                     // [13] Subelemento
    str(item.FonteRecurso),                    // [14] Fonte de Recurso
    fMoney(item.ValorEmpenhado),               // [15] Vl. Empenhado
    fMoney(item.ValorAnulacao),                // [16] Vl. Anulação
    fMoney(item.ValorLiquidado),               // [17] Vl. Liquidado
    fMoney(item.ValorPago),                    // [18] Vl. Pago
    fMoney(item.SaldoPagar),                   // [19] Saldo a Pagar
    str(item.Historico),                       // [20] Histórico (sanitizado — texto preservado)
    item.Id != null ? Number(item.Id) : 0,    // [21] Id numérico (join fallback para Pagamentos)
  ];
}

export async function getEmpenhos(
  year: number,
  onProgress?: ProgressCallback,
  onOrgao?: OnOrgaoCallback,
): Promise<DattagoApiResult> {
  const key    = cacheKey('emp', { year });
  const cached = readCache<EmpRow[]>(key);
  if (cached) {
    onOrgao?.({ api: 'emp', fromCache: true, count: cached.length });
    return { rows: cached, completeness: 1.0, taskCount: 0, log: null };
  }

  const log    = new ImportLog('Empenhos', 'getempenhos');
  const chunks = monthlyChunks(year);
  const ini    = chunks[0].ini;
  const fin    = chunks[chunks.length - 1].fin;
  log.dateRange = `${ini} — ${fin}`;
  log.taskCount = 1;

  const rawByTask: Array<TaskResult<RawEmpenho> | null> = [null];
  const onOrgaoRef: OnOrgaoRef = { current: onOrgao };

  const tasks: AsyncTask[] = [async () => {
    // ── Fase 1: requisição única com paginação automática ──────────────────
    const cap: { code?: number; reason?: string } = {};
    const phase1 = await fetchAllPages<RawEmpenho>(
      'getempenhos', { dataInicio: ini, dataFim: fin },
      empKey, 'Empenhos', onProgress, cap,
    );

    if (phase1.permanent) {
      rawByTask[0] = { items: [], failed: true, permanent: true };
      onOrgaoRef.current?.({ api: 'emp', monthLabel: null, orgao: DUMMY_ORGAO, orgaoIdx: 0, count: 0, error: true, errorCode: cap.code, errorReason: cap.reason });
      return;
    }
    if (phase1.failed) {
      rawByTask[0] = { items: [], failed: true, permanent: false };
      onOrgaoRef.current?.({ api: 'emp', monthLabel: null, orgao: DUMMY_ORGAO, orgaoIdx: 0, count: 0, error: true, errorCode: cap.code, errorReason: cap.reason });
      return;
    }

    const allItems: RawEmpenho[] = [...phase1.items];
    const apiReported = phase1.totalReg;

    // ── Fase 2: fallback mensal — ativo somente se fase 1 incompleta ───────
    if (apiReported != null && allItems.length < apiReported) {
      onProgress?.(`Empenhos — incompleto (${allItems.length}/${apiReported}), buscando por mês…`);

      const seen2    = new Set<string>(allItems.map(empKey));
      const monthRaw: Array<Awaited<ReturnType<typeof fetchAllPages<RawEmpenho>>> | null> = new Array(chunks.length).fill(null);

      await concurrentPool(
        chunks.map((chunk, ci): AsyncTask => async () => {
          const res = await fetchAllPages<RawEmpenho>(
            'getempenhos',
            { dataInicio: chunk.ini, dataFim: chunk.fin },
            empKey, `Empenhos ${chunk.label}`, onProgress,
          );
          monthRaw[ci] = res;
        }),
        FALLBACK_CONCURRENCY,
      );

      // Mescla e identifica empenhos que estavam faltantes na fase 1
      const recovered: Array<{ numero: string; orgao: string; data: string }> = [];
      for (const res of monthRaw) {
        if (!res || res.failed) continue;
        for (const item of res.items) {
          const k = empKey(item);
          if (!seen2.has(k)) {
            seen2.add(k);
            allItems.push(item);
            recovered.push({
              numero: str(item.Numero),
              orgao:  str(item.OrgaoGestor),
              data:   normDate(item.Data),
            });
          }
        }
      }

      if (recovered.length > 0) {
        log.recoveredItems = recovered;
        console.group(`[Empenhos] ${recovered.length} empenho(s) recuperado(s) na fase 2:`);
        recovered.forEach(r => console.log(`  Nº ${r.numero} · ${r.orgao} · ${r.data}`));
        console.groupEnd();
      }
    }

    rawByTask[0] = { items: allItems, failed: false };

    // Registra TotalRegistros e inconsistência se ainda faltam após fase 2
    if (apiReported != null) {
      log.apiReported = apiReported;
      if (allItems.length < apiReported) {
        log.inconsistencies.push({
          chunk:    `${ini}–${fin}`,
          reported: apiReported,
          received: allItems.length,
          missing:  apiReported - allItems.length,
        });
      }
    }

    onOrgaoRef.current?.({
      api: 'emp', monthLabel: null, orgao: DUMMY_ORGAO,
      orgaoIdx: 0, count: allItems.length, error: false,
    });
  }];

  await concurrentPool(tasks, CONCURRENCY);
  await retryLoop(rawByTask, tasks, 'Empenhos', onProgress, onOrgaoRef, log);

  // Items já deduplicados dentro de fetchAllPages/seen2; órgãos bloqueados excluídos.
  const rows: EmpRow[] = (rawByTask[0]?.items ?? []).map(mapEmpenho).filter(r => !isOrgaoBloqueado(r[1]));

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
