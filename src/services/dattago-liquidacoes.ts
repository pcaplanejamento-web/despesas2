// dattago-liquidacoes.ts — importação da API Liquidações (getliquidacoes)
//
// Port de assets/js/services/dattago-liquidacoes.js (V3 — Service Layer).
//
// Estrutura da resposta:
//   $type, Id (int), NumeroLiquidacao (string), DataLiquidacao (DD/MM/YYYY),
//   NumeroEmpenho (string — join key), CpfCnpjCredor, Credor, Historico (sanitizado — texto preservado),
//   Valor/ValorAnulacao/ValorLiquido/ValorPago/Saldo (strings "N,NN"),
//   Orgao (string), docs (array vazio).
//
// NÃO possui TotalRegistros; sem detecção de incompletude.
// Parâmetros: { dataInicio, dataFim, idOrgao } — filtro por órgão obrigatório.
//
// Estratégia: CONCURRENCY_HEAVY (3 tasks simultâneas) com stagger 200ms entre workers.
// API pesada — orgãos grandes (Prefeitura, Fundo Saúde) retornam volumes altos e causam
// "erro de rede" quando muitas requests concorrem. Paginação automática dentro de cada task.

import {
  ORGAOS, normDate, fMoney, str,
  fetchAllPages, calcCompleteness, retryLoop,
  CONCURRENCY_HEAVY, concurrentPool,
  writeCache, readCache, cacheKey, monthlyChunks,
  isOrgaoBloqueado, ImportLog,
} from './dattago-core';
import type { LiqRow } from '@/lib/compute';
import type {
  OnOrgaoCallback, OnOrgaoRef, ProgressCallback, TaskResult, AsyncTask,
} from './dattago-core';
import type { DattagoApiResult } from './dattago-empenhos';

/** Forma bruta de um item da API getliquidacoes (após parse JSON). */
interface RawLiquidacao {
  Id?:                number | string | null;
  id?:                number | string | null;
  NumeroLiquidacao?:  string | null;
  DataLiquidacao?:    string | null;
  NumeroEmpenho?:     string | null;
  CpfCnpjCredor?:     string | null;
  Credor?:            string | null;
  Historico?:         string | null;
  Valor?:             string | number | null;
  ValorAnulacao?:     string | number | null;
  ValorLiquido?:      string | number | null;
  ValorPago?:         string | number | null;
  Saldo?:             string | number | null;
  Orgao?:             string | null;
}

function liqKey(item: RawLiquidacao): string {
  const id = str(item.Id ?? item.id ?? '');
  return id || `${str(item.NumeroLiquidacao)}|${str(item.NumeroEmpenho)}|${normDate(item.DataLiquidacao)}`;
}

function mapLiquidacao(item: RawLiquidacao): LiqRow {
  return [
    normDate(item.DataLiquidacao),  // [0]  Data Liquidação
    str(item.Orgao),                // [1]  Órgão (presente no item)
    str(item.Credor),               // [2]  Credor
    str(item.CpfCnpjCredor),        // [3]  CPF/CNPJ (dígitos sem máscara)
    str(item.NumeroLiquidacao),     // [4]  Nº Liquidação
    str(item.NumeroEmpenho),        // [5]  Nº Empenho (join key para Tipo)
    fMoney(item.Valor),             // [6]  Valor
    fMoney(item.ValorAnulacao),     // [7]  Vl. Anulação
    fMoney(item.ValorLiquido),      // [8]  Vl. Líquido
    fMoney(item.ValorPago),         // [9]  Vl. Pago
    fMoney(item.Saldo),             // [10] Saldo
    str(item.Historico),            // [11] Histórico (sanitizado — texto preservado)
    // [12] Tipo — preenchido em Fase 2 (enrichLiqRows) após todos os empRows
  ];
}

export async function getLiquidacoes(
  year: number,
  onProgress?: ProgressCallback,
  onOrgao?: OnOrgaoCallback,
): Promise<DattagoApiResult<LiqRow>> {
  const key    = cacheKey('liq', { year });
  const cached = readCache<LiqRow[]>(key);
  if (cached) {
    onOrgao?.({ api: 'liq', fromCache: true, count: cached.length });
    return { rows: cached, completeness: 1.0, taskCount: 0, log: null };
  }

  const log    = new ImportLog('Liquidações', 'getliquidacoes');
  const chunks = monthlyChunks(year);
  const ini    = chunks[0].ini;
  const fin    = chunks[chunks.length - 1].fin;
  log.dateRange = `${ini} — ${fin}`;
  log.taskCount = ORGAOS.length;

  const rawByTask: Array<TaskResult<RawLiquidacao> | null> = new Array(ORGAOS.length).fill(null);
  const onOrgaoRef: OnOrgaoRef = { current: onOrgao };

  const tasks: AsyncTask[] = ORGAOS.map((orgao, oi) => async () => {
    const label  = `Liquidações · órgão ${oi + 1}/${ORGAOS.length}`;
    const cap: { code?: number; reason?: string } = {};
    const result = await fetchAllPages<RawLiquidacao>(
      'getliquidacoes',
      { dataInicio: ini, dataFim: fin, idOrgao: orgao.id },
      liqKey, label, onProgress, cap,
    );

    if (result.permanent) {
      rawByTask[oi] = { orgao, items: [], failed: true, permanent: true };
      onOrgaoRef.current?.({ api: 'liq', monthLabel: null, orgao, orgaoIdx: oi, count: 0, error: true, errorCode: cap.code, errorReason: cap.reason });
      return;
    }
    if (result.failed) {
      rawByTask[oi] = { orgao, items: [], failed: true, permanent: false };
      onOrgaoRef.current?.({ api: 'liq', monthLabel: null, orgao, orgaoIdx: oi, count: 0, error: true, errorCode: cap.code, errorReason: cap.reason });
      return;
    }

    rawByTask[oi] = { orgao, items: result.items, failed: false };
    onOrgaoRef.current?.({
      api: 'liq', monthLabel: null, orgao, orgaoIdx: oi,
      count: result.items.length, error: false,
    });
  });

  // HEAVY: 3 workers simultâneos com stagger de 200ms para evitar burst e erros de rede
  await concurrentPool(tasks, CONCURRENCY_HEAVY, 200);
  await retryLoop(rawByTask, tasks, 'Liquidações', onProgress, onOrgaoRef, log);

  const seen = new Set<string>();
  const rows: LiqRow[] = [];
  for (const entry of rawByTask) {
    if (!entry) continue;
    for (const item of entry.items) {
      const k = liqKey(item);
      if (seen.has(k)) continue;
      if (isOrgaoBloqueado(item.Orgao)) continue;
      seen.add(k);
      rows.push(mapLiquidacao(item));
    }
  }

  log.rawCount      = rawByTask.reduce((s, e) => s + (e?.items?.length ?? 0), 0);
  log.tasksFailed   = rawByTask.filter(e => e?.permanent === true).length;
  log.importedCount = rows.length;
  const completeness = calcCompleteness(rawByTask);
  log.finish(completeness);

  if (completeness >= 1.0) {
    writeCache(key, rows, { completeness, taskCount: log.taskCount, rowCount: rows.length });
  }
  return { rows, completeness, taskCount: log.taskCount, log };
}
