// enrichment.ts — enriquece linhas dos endpoints Dattago.
//
// Port de assets/js/services/dattago-enrichment.js (Onda 7.2 do projeto vanilla,
// extraído de pages/dattago-tables.js).
//
// Estas funções são puras (sem DOM) e fazem joins/derivações entre os
// endpoints da API Dattago:
//
//   enrichPgtoRows(pgtoRows, empRows)  → adiciona col [13] Tipo
//   enrichLiqRows(liqRows, empRows)    → adiciona col [12] Tipo
//   enrichCtrRows(ctrRows, empRows)    → adiciona col [17] Unidade Orçamentária
//   enrichEmpWithContrato(emp, ctr)    → adiciona col [21] Nº Contrato (overwrite)
//
// Tipo (Pagamento/Liquidação):
//   data inválida              → ERRO
//   sem nº empenho             → RESTO A PAGAR
//   empenho não encontrado     → RESTO A PAGAR
//   empenho de ano anterior    → RESTO A PAGAR
//   empenho do mesmo ano       → NOTA DE EMPENHO

import type { EmpRow, LiqRow, PgtoRow, CtrRow } from './compute';

/** Resultado da classificação Tipo aplicada por enrichPgtoRows / enrichLiqRows. */
export type TipoEvento = 'RESTO A PAGAR' | 'NOTA DE EMPENHO' | 'ERRO' | '';

// ── Helpers internos ──────────────────────────────────────────

function extractYear(dateStr: unknown): number | null {
  const m = String(dateStr ?? '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? parseInt(m[3], 10) : null;
}

function buildEmpYearMap(empRows: readonly EmpRow[]): Map<string, number | null> {
  const map = new Map<string, number | null>(); // NºEmpenho → ano | null (data inválida)
  for (const emp of empRows) {
    const nEmp = String(emp[5] ?? '').trim();
    if (!nEmp) continue;
    map.set(nEmp, extractYear(emp[0]));
  }
  return map;
}

function classifyTipo(
  nEmp: string,
  eventYear: number | null,
  empYearMap: Map<string, number | null>,
): TipoEvento {
  if (!nEmp)                 return 'RESTO A PAGAR';
  if (eventYear === null)    return 'ERRO';
  if (!empYearMap.has(nEmp)) return 'RESTO A PAGAR';
  const empYear = empYearMap.get(nEmp) ?? null;
  if (empYear === null)      return 'ERRO';
  if (empYear < eventYear)   return 'RESTO A PAGAR';
  if (empYear === eventYear) return 'NOTA DE EMPENHO';
  return 'ERRO';
}

// ── API pública ───────────────────────────────────────────────

/** Adiciona coluna [13] = Tipo (RESTOS A PAGAR / NOTA DE EMPENHO) em Pagamentos. */
export function enrichPgtoRows(
  pgtoRows: readonly PgtoRow[],
  empRows: readonly EmpRow[],
): PgtoRow[] {
  if (!empRows.length) return pgtoRows.map(row => [...row, '']);
  const empYearMap = buildEmpYearMap(empRows);
  return pgtoRows.map(row => {
    const nEmp     = String(row[12] ?? '').trim() || String(row[5] ?? '').trim();
    const pgtoYear = extractYear(row[0]);
    return [...row, classifyTipo(nEmp, pgtoYear, empYearMap)];
  });
}

/** Adiciona coluna [12] = Tipo (RESTOS A PAGAR / NOTA DE EMPENHO) em Liquidações. */
export function enrichLiqRows(
  liqRows: readonly LiqRow[],
  empRows: readonly EmpRow[],
): LiqRow[] {
  if (!empRows.length) return liqRows.map(row => [...row, '']);
  const empYearMap = buildEmpYearMap(empRows);
  return liqRows.map(row => {
    const nEmp    = String(row[5] ?? '').trim();
    const liqYear = extractYear(row[0]);
    return [...row, classifyTipo(nEmp, liqYear, empYearMap)];
  });
}

/** Adiciona coluna [17] Unid. Orçamentária a ctrRows via join pelo Nº Empenho. */
export function enrichCtrRows(
  ctrRows: readonly CtrRow[],
  empRows: readonly EmpRow[],
): CtrRow[] {
  const empUnidMap = new Map<string, string>();
  for (const r of empRows) {
    const num = String(r[5] ?? '').trim();
    if (num && !empUnidMap.has(num)) empUnidMap.set(num, String(r[2] ?? ''));
  }
  return ctrRows.map(r => [...r, empUnidMap.get(String(r[6] ?? '').trim()) ?? '']);
}

/** Adiciona coluna [21] N. Contrato a empRows via join pelo Nº Empenho.
 *  ATENÇÃO: Id numérico (CE.ID = 21) desloca de [21] → [22] na versão enriquecida.
 *  Seguro porque compute.ts opera sobre empRows ORIGINAL. */
export function enrichEmpWithContrato(
  empRows: readonly EmpRow[],
  ctrRows: readonly CtrRow[],
): EmpRow[] {
  const contratoMap = new Map<string, Set<string>>();
  for (const r of ctrRows) {
    const numEmp   = String(r[6] ?? '').trim();
    const contrato = String(r[4] ?? '').trim();
    if (numEmp && contrato) {
      if (!contratoMap.has(numEmp)) contratoMap.set(numEmp, new Set());
      contratoMap.get(numEmp)!.add(contrato);
    }
  }
  return empRows.map(r => {
    const num = String(r[5] ?? '').trim();
    const s   = contratoMap.get(num);
    const nc  = s ? [...s].join(', ') : '';
    return [...r.slice(0, 21), nc, r[21]];
  });
}
