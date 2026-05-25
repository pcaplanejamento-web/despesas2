import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatPercent,
  formatShort,
  getMonthName,
  compareLocale,
  getCurrentLocale,
  MESES,
} from "./locale";

// ══════════════════════════════════════════════════════════════
//  formatCurrency — pt-BR / BRL
// ══════════════════════════════════════════════════════════════

describe("formatCurrency", () => {
  it("formata valor numérico em BRL", () => {
    expect(formatCurrency(1234.5)).toMatch(/R\$\s*1\.234,50/);
  });

  it("formata zero", () => {
    expect(formatCurrency(0)).toMatch(/R\$\s*0,00/);
  });

  it("trata null/undefined como 0", () => {
    expect(formatCurrency(null)).toMatch(/R\$\s*0,00/);
    expect(formatCurrency(undefined)).toMatch(/R\$\s*0,00/);
  });

  it("aceita string numérica", () => {
    expect(formatCurrency("99.5")).toMatch(/R\$\s*99,50/);
  });

  it("formata valor negativo", () => {
    expect(formatCurrency(-500)).toMatch(/-/);
    expect(formatCurrency(-500)).toMatch(/500,00/);
  });
});

// ══════════════════════════════════════════════════════════════
//  formatPercent
// ══════════════════════════════════════════════════════════════

describe("formatPercent", () => {
  it("formata 0.5 como 50,0%", () => {
    expect(formatPercent(0.5)).toBe("50,0%");
  });

  it("formata 1 como 100,0%", () => {
    expect(formatPercent(1)).toBe("100,0%");
  });

  it("formata 0 como 0,0%", () => {
    expect(formatPercent(0)).toBe("0,0%");
  });

  it("trata null como 0", () => {
    expect(formatPercent(null)).toBe("0,0%");
  });
});

// ══════════════════════════════════════════════════════════════
//  formatShort — abreviação K/M/B
// ══════════════════════════════════════════════════════════════

describe("formatShort", () => {
  it("formata < 1k sem sufixo", () => {
    expect(formatShort(500)).toBe("500");
  });

  it("formata milhares com K", () => {
    expect(formatShort(1500)).toMatch(/1,5K/);
  });

  it("formata milhões com M", () => {
    expect(formatShort(2_500_000)).toMatch(/2,5M/);
  });

  it("formata bilhões com B", () => {
    expect(formatShort(3_700_000_000)).toMatch(/3,7B/);
  });

  it("respeita sinal negativo", () => {
    expect(formatShort(-1500)).toMatch(/-1,5K/);
  });
});

// ══════════════════════════════════════════════════════════════
//  getMonthName + MESES
// ══════════════════════════════════════════════════════════════

describe("getMonthName", () => {
  it("retorna nome do mês 1-indexed", () => {
    expect(getMonthName(1)).toBe("Janeiro");
    expect(getMonthName(6)).toBe("Junho");
    expect(getMonthName(12)).toBe("Dezembro");
  });

  it("retorna fallback 'Mês N' p/ mês fora do range 1-12", () => {
    expect(getMonthName(13)).toBe("Mês 13");
    expect(getMonthName(0)).toBe("Mês 0");
  });
});

describe("MESES (compat)", () => {
  it("tem 12 entradas em pt-BR", () => {
    expect(MESES).toHaveLength(12);
    expect(MESES[0]).toBe("Janeiro");
    expect(MESES[11]).toBe("Dezembro");
  });
});

// ══════════════════════════════════════════════════════════════
//  compareLocale — sort pt-BR
// ══════════════════════════════════════════════════════════════

describe("compareLocale", () => {
  it("ordena strings locale-aware", () => {
    expect(compareLocale("zebra", "alfa")).toBeGreaterThan(0);
    expect(compareLocale("alfa", "zebra")).toBeLessThan(0);
    expect(compareLocale("igual", "igual")).toBe(0);
  });

  it("ignora null como string vazia", () => {
    expect(compareLocale(null, "a")).toBeLessThan(0);
  });

  it("ordena acentos corretamente (pt-BR)", () => {
    // 'á' e 'a' são vizinhos em pt-BR
    expect(Math.abs(compareLocale("ácido", "acido"))).toBeLessThan(2);
  });
});

// ══════════════════════════════════════════════════════════════
//  getCurrentLocale
// ══════════════════════════════════════════════════════════════

describe("getCurrentLocale", () => {
  it("retorna pt-BR como default", () => {
    const loc = getCurrentLocale();
    expect(loc.id).toBe("pt-BR");
    expect(loc.currency).toBe("BRL");
    expect(loc.months).toHaveLength(12);
    expect(loc.monthsAbbrev).toHaveLength(12);
  });
});
