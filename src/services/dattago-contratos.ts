// dattago-contratos.ts — importação da API Contratos (ListaCredores)
//
// Port de assets/js/services/dattago-contratos.js (V3 — Service Layer).
//
// Estrutura da resposta:
//   $type, Processo (string), NumeroContrato (string), Licitacao (string),
//   CpfCnpj (string — já com máscara), Nome (string), NumeroEmpenho (string),
//   ValorEmpenho/ValorLiquidacao/ValorPago (strings pt-BR), Parcela (string),
//   Liquidacao/Vencimento (DD/MM/YYYY ou ""), Atesto/Pagamento (string),
//   Justificativa (string), Motivo (string)
//
// Parâmetros: { fonte: [code], ano: number }
//   Uma task por fonte de FONTE_CODES_CONTRATOS — 26 requisições paralelas.
//   Cada item recebe [16] Fonte de Recurso com o código numérico da fonte.
//
// Estratégia: CONCURRENCY_LIGHT (5 tasks) — 26 fontes com dados relativamente leves por request.

import {
  str, normDate, fMoney, dattagoPost,
  CONCURRENCY_LIGHT, concurrentPool, calcCompleteness, retryLoop,
  writeCache, readCache, cacheKey, ImportLog,
} from './dattago-core';
import type { CtrRow } from '@/lib/compute';
import type {
  OnOrgaoCallback, OnOrgaoRef, ProgressCallback, TaskResult, AsyncTask,
  PermanentFailure,
} from './dattago-core';
import type { DattagoApiResult } from './dattago-empenhos';

/** Códigos de fonte fixos para a API ListaCredores (26 fontes configuradas). */
export const FONTE_CODES_CONTRATOS: readonly number[] = [
  100, 101, 102, 107, 109, 115, 116, 117,
  120, 121, 122, 123, 124, 125, 126, 127,
  129, 131, 137, 150, 151, 170, 171, 174,
  192, 193,
];

/** Forma bruta de um item da API ListaCredores. */
interface RawContrato {
  Liquidacao?:     string | null;
  Nome?:           string | null;
  CpfCnpj?:        string | null;
  Processo?:       string | null;
  NumeroContrato?: string | null;
  Licitacao?:      string | null;
  NumeroEmpenho?:  string | null;
  Parcela?:        string | null;
  ValorEmpenho?:   string | number | null;
  ValorLiquidacao?: string | number | null;
  ValorPago?:      string | number | null;
  Atesto?:         string | null;
  Vencimento?:     string | null;
  Pagamento?:      string | null;
  Justificativa?:  string | null;
  Motivo?:         string | null;
}

function contrKey(item: RawContrato): string {
  return `${str(item.NumeroEmpenho)}|${str(item.Parcela)}|${normDate(item.Liquidacao)}`;
}

function mapContrato(item: RawContrato, fonteCode: number): CtrRow {
  return [
    normDate(item.Liquidacao),        // [0]  Data Liq.
    str(item.Nome),                   // [1]  Credor
    str(item.CpfCnpj),                // [2]  CPF/CNPJ (já com máscara)
    str(item.Processo),               // [3]  Processo
    str(item.NumeroContrato),         // [4]  N. Contrato
    str(item.Licitacao),              // [5]  Licitação
    str(item.NumeroEmpenho),          // [6]  Nº Empenho
    str(item.Parcela),                // [7]  Parcela
    fMoney(item.ValorEmpenho),        // [8]  Vl. Empenho   (pt-BR string)
    fMoney(item.ValorLiquidacao),     // [9]  Vl. Liquidação (pt-BR string)
    fMoney(item.ValorPago),           // [10] Vl. Pago       (pt-BR string)
    str(item.Atesto),                 // [11] Atesto
    normDate(item.Vencimento),        // [12] Vencimento
    str(item.Pagamento),              // [13] Pagamento
    str(item.Justificativa),          // [14] Justificativa
    str(item.Motivo),                 // [15] Motivo
    String(fonteCode),                // [16] Fonte de Recurso
  ];
}

export async function getContratos(
  ano: number,
  onProgress?: ProgressCallback,
  onOrgao?: OnOrgaoCallback,
): Promise<DattagoApiResult<CtrRow>> {
  const key    = cacheKey('ctr', { ano });
  const cached = readCache<CtrRow[]>(key);
  // Verifica também cached.length > 0: [] em JS é truthy, mas cache vazio deve ser ignorado
  if (cached && cached.length > 0) {
    onOrgao?.({ api: 'ctr', fromCache: true, count: cached.length });
    return { rows: cached, completeness: 1.0, taskCount: FONTE_CODES_CONTRATOS.length, log: null };
  }

  const log     = new ImportLog('Contratos', 'ListaCredores');
  log.dateRange = String(ano);
  log.taskCount = FONTE_CODES_CONTRATOS.length;

  const rawByFonte: Array<TaskResult<RawContrato> | null> = new Array(FONTE_CODES_CONTRATOS.length).fill(null);
  const onFonteRef: OnOrgaoRef = { current: onOrgao };

  const tasks: AsyncTask[] = FONTE_CODES_CONTRATOS.map((fonte, fi) => async () => {
    onProgress?.(`Contratos — fonte ${fonte}`);
    const cap: { code?: number; reason?: string } = {};
    const result     = await dattagoPost('ListaCredores', { fonte: [fonte], ano }, cap);
    const failed     = result === null || (result != null && !Array.isArray(result));
    const permanent  = !!((result as PermanentFailure | null)?.permanent);
    const items      = Array.isArray(result) ? (result as RawContrato[]) : [];
    if (failed) {
      rawByFonte[fi] = { fonte, items: [], failed: true, permanent };
      onFonteRef.current?.({ api: 'ctr', fonteCode: fonte, count: 0, error: true, errorCode: cap.code, errorReason: cap.reason });
    } else {
      rawByFonte[fi] = { fonte, items, failed: false };
      onFonteRef.current?.({ api: 'ctr', fonteCode: fonte, count: items.length, error: false });
    }
  });

  // LIGHT: 5 workers — 26 fontes com volume leve por request (5.5K registros total)
  await concurrentPool(tasks, CONCURRENCY_LIGHT);
  await retryLoop(rawByFonte, tasks, 'Contratos', onProgress, onFonteRef, log);

  const seen = new Set<string>();
  const rows: CtrRow[] = [];
  for (const entry of rawByFonte) {
    if (!entry || entry.fonte === undefined) continue;
    for (const item of entry.items) {
      const k = contrKey(item);
      if (!seen.has(k)) { seen.add(k); rows.push(mapContrato(item, entry.fonte)); }
    }
  }

  log.rawCount      = rawByFonte.reduce((s, e) => s + (e?.items?.length ?? 0), 0);
  log.tasksFailed   = rawByFonte.filter(e => e?.permanent === true).length;
  log.importedCount = rows.length;
  const completeness = calcCompleteness(rawByFonte);
  log.finish(completeness);

  // Só cacheia se completo e com registros — falhas parciais ou vazios não são persistidos
  if (completeness >= 1.0 && rows.length > 0) {
    writeCache(key, rows, { completeness, taskCount: log.taskCount, rowCount: rows.length });
  }
  return { rows, completeness, taskCount: log.taskCount, log };
}
