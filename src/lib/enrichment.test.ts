import { describe, it, expect } from "vitest";
import { enrichLiqRows, enrichPgtoRows } from "./enrichment";
import type { EmpRow, LiqRow, PgtoRow } from "./compute";

// ── Fixtures ───────────────────────────────────────────────────
//
// Importante: enrichLiqRows e enrichPgtoRows fazem `[...row, classifyTipo(...)]`
// → APPEND. O Tipo lança na posição row.length, não num índice fixo.
//
// Pré-enrichment shapes (do mapEmpenho / mapLiquidacao / mapPagamento):
//   EmpRow:  22 cols (0–21)
//   LiqRow:  12 cols (0–11)   → enrichLiqRows append Tipo na pos 12
//   PgtoRow: 13 cols (0–12)   → enrichPgtoRows append Tipo na pos 13
//
// Aqui usamos só os índices que enrichment lê: DATA=0, NUM_EMP=5 (emp + liq)
// e NUM_EMP=12 / 5 fallback (pgto).

function emp(numEmp: string, dataAno: string): EmpRow {
  const r = new Array(22).fill(null) as unknown[];
  r[0] = dataAno;
  r[5] = numEmp;
  return r as EmpRow;
}

function liq(numEmp: string, dataAno: string): LiqRow {
  // 12 elementos antes do enrichment — Tipo será append na pos 12.
  const r = new Array(12).fill(null) as unknown[];
  r[0] = dataAno;
  r[5] = numEmp;
  return r as LiqRow;
}

function pgto(numEmp: string, dataAno: string): PgtoRow {
  // 13 elementos antes do enrichment — Tipo será append na pos 13.
  const r = new Array(13).fill(null) as unknown[];
  r[0]  = dataAno;
  r[12] = numEmp;  // CP.NUM_EMP (string)
  return r as PgtoRow;
}

// ══════════════════════════════════════════════════════════════
//  enrichLiqRows — classificação de Tipo (append na pos 12)
// ══════════════════════════════════════════════════════════════

describe("enrichLiqRows", () => {
  const empRows = [
    emp("001", "10/01/2026"),
    emp("002", "10/06/2025"),
    emp("003", "01/02/2026"),
  ];
  const TIPO_IDX = 12;

  it("classifica NOTA DE EMPENHO quando ano da liq = ano do empenho", () => {
    const liqRows = [liq("001", "15/03/2026")];
    const enriched = enrichLiqRows(liqRows, empRows);
    expect(enriched[0]).toHaveLength(13);
    expect(enriched[0][TIPO_IDX]).toBe("NOTA DE EMPENHO");
  });

  it("classifica RESTO A PAGAR quando empenho é de ano anterior", () => {
    const liqRows = [liq("002", "15/03/2026")]; // empenho 002 é de 2025
    const enriched = enrichLiqRows(liqRows, empRows);
    expect(enriched[0][TIPO_IDX]).toBe("RESTO A PAGAR");
  });

  it("classifica RESTO A PAGAR quando NUM_EMP não existe no map", () => {
    const liqRows = [liq("999", "15/03/2026")];
    const enriched = enrichLiqRows(liqRows, empRows);
    expect(enriched[0][TIPO_IDX]).toBe("RESTO A PAGAR");
  });

  it("classifica ERRO quando data da liq é inválida", () => {
    const liqRows = [liq("001", "data-invalida")];
    const enriched = enrichLiqRows(liqRows, empRows);
    expect(enriched[0][TIPO_IDX]).toBe("ERRO");
  });

  it("classifica RESTO A PAGAR quando NUM_EMP é vazio", () => {
    const liqRows = [liq("", "15/03/2026")];
    const enriched = enrichLiqRows(liqRows, empRows);
    expect(enriched[0][TIPO_IDX]).toBe("RESTO A PAGAR");
  });

  it("retorna novo array (não mesma referência)", () => {
    const liqRows = [liq("001", "15/03/2026")];
    const enriched = enrichLiqRows(liqRows, empRows);
    expect(enriched).not.toBe(liqRows);
    expect(enriched).toHaveLength(1);
  });

  it("retorna rows com Tipo vazio quando empRows está vazio", () => {
    const liqRows = [liq("001", "15/03/2026")];
    const enriched = enrichLiqRows(liqRows, []);
    expect(enriched[0][TIPO_IDX]).toBe("");
  });
});

// ══════════════════════════════════════════════════════════════
//  enrichPgtoRows — append na pos 13
// ══════════════════════════════════════════════════════════════

describe("enrichPgtoRows", () => {
  const empRows = [emp("001", "10/01/2026")];
  const TIPO_IDX = 13;

  it("classifica NOTA DE EMPENHO no caso mesmo-ano", () => {
    const pgtoRows = [pgto("001", "20/03/2026")];
    const enriched = enrichPgtoRows(pgtoRows, empRows);
    expect(enriched[0]).toHaveLength(14);
    expect(enriched[0][TIPO_IDX]).toBe("NOTA DE EMPENHO");
  });

  it("classifica RESTO A PAGAR quando empenho não consta", () => {
    const pgtoRows = [pgto("999", "20/03/2026")];
    const enriched = enrichPgtoRows(pgtoRows, empRows);
    expect(enriched[0][TIPO_IDX]).toBe("RESTO A PAGAR");
  });
});
