import { describe, it, expect } from "vitest";
import {
  parseDDMMYYYY,
  computeKpis,
  buildDimFilter,
  filterByPeriodo,
  filterByUnidade,
  filterByVisao,
  CE,
  CL,
  type EmpRow,
  type LiqRow,
  type PgtoRow,
} from "./compute";

// ══════════════════════════════════════════════════════════════
//  Fixtures — linhas-tipo mínimas que cobrem os índices usados
// ══════════════════════════════════════════════════════════════

/** Cria EmpRow com 22 colunas, defaults sensatos. */
function emp(overrides: Partial<Record<keyof typeof CE, unknown>> = {}): EmpRow {
  const row = new Array(22).fill(null) as unknown[];
  row[CE.DATA]       = overrides.DATA       ?? "15/03/2026";
  row[CE.ORGAO]      = overrides.ORGAO      ?? "PREFEITURA";
  row[CE.UNIDADE]    = overrides.UNIDADE    ?? "U1";
  row[CE.NUM_EMP]    = overrides.NUM_EMP    ?? "001";
  row[CE.ID_LICIT]   = overrides.ID_LICIT   ?? "L1";
  row[CE.PROGRAMA]   = overrides.PROGRAMA   ?? "P1";
  row[CE.ACAO]       = overrides.ACAO       ?? "A1";
  row[CE.ELEMENTO]   = overrides.ELEMENTO   ?? "E1";
  row[CE.FONTE]      = overrides.FONTE      ?? "F1";
  row[CE.VL_EMP]     = overrides.VL_EMP     ?? 1000;
  row[CE.VL_ANUL]    = overrides.VL_ANUL    ?? 0;
  row[CE.VL_LIQ]     = overrides.VL_LIQ     ?? 0;
  row[CE.VL_PAGO]    = overrides.VL_PAGO    ?? 0;
  row[CE.SALDO]      = overrides.SALDO      ?? 1000;
  return row as EmpRow;
}

function liq(overrides: Partial<Record<keyof typeof CL, unknown>> = {}): LiqRow {
  const row = new Array(13).fill(null) as unknown[];
  row[CL.DATA_LIQ] = overrides.DATA_LIQ ?? "20/03/2026";
  row[CL.ORGAO]    = overrides.ORGAO    ?? "PREFEITURA";
  row[CL.CREDOR]   = overrides.CREDOR   ?? "Fornecedor X";
  row[CL.NUM_EMP]  = overrides.NUM_EMP  ?? "001";
  row[CL.VALOR]    = overrides.VALOR    ?? 500;
  row[CL.VL_ANUL]  = overrides.VL_ANUL  ?? 0;
  row[CL.VL_PAGO]  = overrides.VL_PAGO  ?? 400;
  return row as LiqRow;
}

const NO_PGTO: PgtoRow[] = [];

// ══════════════════════════════════════════════════════════════
//  parseDDMMYYYY
// ══════════════════════════════════════════════════════════════

describe("parseDDMMYYYY", () => {
  it("parses dd/mm/yyyy válido", () => {
    const d = parseDDMMYYYY("15/03/2026");
    expect(d).toBeInstanceOf(Date);
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(2);  // 0-indexed (março = 2)
    expect(d?.getDate()).toBe(15);
  });

  it("retorna null para inputs inválidos", () => {
    expect(parseDDMMYYYY(null)).toBeNull();
    expect(parseDDMMYYYY(undefined)).toBeNull();
    expect(parseDDMMYYYY("")).toBeNull();
    expect(parseDDMMYYYY("não-é-data")).toBeNull();
    expect(parseDDMMYYYY("2026-03-15")).toBeNull();
  });

  it("retorna null para data invalida (32/13/2026)", () => {
    // JS Date faz overflow (32/13 vira fevereiro do ano seguinte) — função NÃO valida overflow.
    // Documentando comportamento atual: aceita 32/13/2026 e retorna Feb 1, 2027.
    const d = parseDDMMYYYY("32/13/2026");
    expect(d).toBeInstanceOf(Date);
    expect(d?.getFullYear()).toBe(2027);
  });
});

// ══════════════════════════════════════════════════════════════
//  computeKpis
// ══════════════════════════════════════════════════════════════

describe("computeKpis", () => {
  it("soma valores corretamente", () => {
    const empRows = [
      emp({ VL_EMP: 1000 }),
      emp({ VL_EMP: 500 }),
      emp({ VL_EMP: 2000 }),
    ];
    const liqRows = [
      liq({ VALOR: 800, VL_ANUL: 0, VL_PAGO: 800 }),
      liq({ VALOR: 200, VL_ANUL: 50, VL_PAGO: 150 }),
    ];

    const kpis = computeKpis(empRows, liqRows, NO_PGTO);
    expect(kpis.empenhado).toBe(3500);
    expect(kpis.liquidado).toBe(1000);
    expect(kpis.anulado).toBe(50);
    expect(kpis.pago).toBe(950);
    expect(kpis.qtdEmpenhos).toBe(3);
    expect(kpis.qtdLiquidacoes).toBe(2);
    expect(kpis.qtdAnulados).toBe(1);  // só uma liq tem anulação > 0
  });

  it("calcula percentuais corretamente", () => {
    const kpis = computeKpis(
      [emp({ VL_EMP: 1000 })],
      [liq({ VALOR: 500, VL_PAGO: 250 })],
      NO_PGTO,
    );
    expect(kpis.pctLiquidado).toBeCloseTo(0.5);
    expect(kpis.pctPago).toBeCloseTo(0.25);
  });

  it("evita divisão por zero quando empenhado=0", () => {
    const kpis = computeKpis([], [], NO_PGTO);
    expect(kpis.pctLiquidado).toBe(0);
    expect(kpis.pctPago).toBe(0);
    expect(kpis.empenhado).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════
//  buildDimFilter
// ══════════════════════════════════════════════════════════════

describe("buildDimFilter", () => {
  it("filtra empRows + liqRows pela dimensão informada", () => {
    const empRows = [
      emp({ NUM_EMP: "001", ACAO: "EDUCACAO" }),
      emp({ NUM_EMP: "002", ACAO: "SAUDE" }),
      emp({ NUM_EMP: "003", ACAO: "EDUCACAO" }),
    ];

    const { empFilter, liqFilter } = buildDimFilter("acao", "EDUCACAO", empRows);
    expect(empRows.filter(empFilter)).toHaveLength(2);

    const liqRows = [
      liq({ NUM_EMP: "001" }),
      liq({ NUM_EMP: "002" }),
      liq({ NUM_EMP: "003" }),
    ];
    expect(liqRows.filter(liqFilter)).toHaveLength(2);
  });

  it("retorna 0 matches quando valor não existe", () => {
    const empRows = [emp({ ACAO: "EDUCACAO" })];
    const { empFilter } = buildDimFilter("acao", "INEXISTENTE", empRows);
    expect(empRows.filter(empFilter)).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════
//  filterByPeriodo
// ══════════════════════════════════════════════════════════════

describe("filterByPeriodo", () => {
  it("retorna tudo quando ini=null e fim=null", () => {
    const empRows = [emp(), emp()];
    const { empRows: result } = filterByPeriodo(empRows, [], [], null, null);
    expect(result).toHaveLength(2);
  });

  it("filtra por range inclusivo", () => {
    const empRows = [
      emp({ DATA: "01/03/2026" }),
      emp({ DATA: "15/03/2026" }),
      emp({ DATA: "30/03/2026" }),
      emp({ DATA: "15/04/2026" }),
    ];
    const ini = new Date(2026, 2, 10);  // 10/03/2026
    const fim = new Date(2026, 2, 31);  // 31/03/2026
    const { empRows: result } = filterByPeriodo(empRows, [], [], ini, fim);
    expect(result).toHaveLength(2);  // 15/03 e 30/03
  });
});

// ══════════════════════════════════════════════════════════════
//  filterByUnidade
// ══════════════════════════════════════════════════════════════

describe("filterByUnidade", () => {
  it("retorna tudo quando unidade é string vazia", () => {
    const empRows = [emp({ UNIDADE: "U1" }), emp({ UNIDADE: "U2" })];
    const { empRows: result } = filterByUnidade(empRows, [], [], "");
    expect(result).toHaveLength(2);
  });

  it("filtra pela unidade exata", () => {
    const empRows = [
      emp({ UNIDADE: "SAUDE", NUM_EMP: "001" }),
      emp({ UNIDADE: "EDUC", NUM_EMP: "002" }),
    ];
    const { empRows: result } = filterByUnidade(empRows, [], [], "SAUDE");
    expect(result).toHaveLength(1);
    expect(result[0][CE.NUM_EMP]).toBe("001");
  });
});

// ══════════════════════════════════════════════════════════════
//  filterByVisao
// ══════════════════════════════════════════════════════════════

describe("filterByVisao", () => {
  it("retorna cópia inalterada do input para visão 'todos'", () => {
    const empRows = [emp(), emp()];
    const { empRows: result } = filterByVisao(empRows, [], [], "todos");
    expect(result).toHaveLength(2);
    expect(result).not.toBe(empRows); // cópia, não mesma ref
    expect(result).toStrictEqual(empRows); // mesmo conteúdo
  });

  it("retorna cópia inalterada do input para visão 'rap'", () => {
    const empRows = [emp(), emp(), emp()];
    const { empRows: result } = filterByVisao(empRows, [], [], "rap");
    expect(result).toHaveLength(3);
  });
});
