import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  readImportHistory,
  recordImportHistory,
  clearImportHistory,
  formatDuration,
  type ImportHistoryEntry,
} from "./import-history";

// ── Stub de localStorage (vitest roda em Node, sem DOM) ─────────

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, val: string) { this.data.set(key, String(val)); }
  removeItem(key: string) { this.data.delete(key); }
  clear() { this.data.clear(); }
  key(i: number) { return Array.from(this.data.keys())[i] ?? null; }
}

beforeEach(() => {
  // Re-stub a cada test pra isolar state
  vi.stubGlobal("localStorage", new MemoryStorage());
});

function makeEntry(year: number, durationMs = 1000): ImportHistoryEntry {
  return {
    startedAt: new Date().toISOString(),
    durationMs,
    year,
    perApi: { emp: 100, liq: 50, pgto: 30, rec: 20, ctr: 10 },
    totalRegistros: 210,
    fromCache: false,
    status: "done",
  };
}

// ══════════════════════════════════════════════════════════════
//  readImportHistory
// ══════════════════════════════════════════════════════════════

describe("readImportHistory", () => {
  it("retorna [] quando storage está vazio", () => {
    expect(readImportHistory()).toEqual([]);
  });

  it("retorna [] quando storage tem JSON inválido", () => {
    localStorage.setItem("dattago_import_history_v1", "não-é-json{");
    expect(readImportHistory()).toEqual([]);
  });

  it("retorna [] quando storage tem dado não-array", () => {
    localStorage.setItem("dattago_import_history_v1", JSON.stringify({ foo: "bar" }));
    expect(readImportHistory()).toEqual([]);
  });

  it("retorna entries quando storage tem array válido", () => {
    const entries = [makeEntry(2026), makeEntry(2025)];
    localStorage.setItem("dattago_import_history_v1", JSON.stringify(entries));
    const result = readImportHistory();
    expect(result).toHaveLength(2);
    expect(result[0].year).toBe(2026);
  });
});

// ══════════════════════════════════════════════════════════════
//  recordImportHistory
// ══════════════════════════════════════════════════════════════

describe("recordImportHistory", () => {
  it("grava entry no storage vazio", () => {
    recordImportHistory(makeEntry(2026));
    expect(readImportHistory()).toHaveLength(1);
  });

  it("nova entry vai pro índice 0 (mais recente primeiro)", () => {
    recordImportHistory(makeEntry(2024));
    recordImportHistory(makeEntry(2025));
    recordImportHistory(makeEntry(2026));
    const result = readImportHistory();
    expect(result[0].year).toBe(2026);
    expect(result[1].year).toBe(2025);
    expect(result[2].year).toBe(2024);
  });

  it("mantém só as últimas 20 entries", () => {
    for (let i = 0; i < 25; i++) {
      recordImportHistory(makeEntry(2000 + i));
    }
    const result = readImportHistory();
    expect(result).toHaveLength(20);
    expect(result[0].year).toBe(2024); // 25th iteration = year 2024
    expect(result[19].year).toBe(2005);
  });
});

// ══════════════════════════════════════════════════════════════
//  clearImportHistory
// ══════════════════════════════════════════════════════════════

describe("clearImportHistory", () => {
  it("remove a key do storage", () => {
    recordImportHistory(makeEntry(2026));
    clearImportHistory();
    expect(readImportHistory()).toEqual([]);
  });

  it("no-op se já vazio", () => {
    clearImportHistory();
    expect(readImportHistory()).toEqual([]);
  });
});

// ══════════════════════════════════════════════════════════════
//  formatDuration
// ══════════════════════════════════════════════════════════════

describe("formatDuration", () => {
  it("formata < 1s em ms", () => {
    expect(formatDuration(45)).toBe("45ms");
    expect(formatDuration(999)).toBe("999ms");
  });

  it("formata segundos com 1 decimal", () => {
    expect(formatDuration(2300)).toBe("2.3s");
    expect(formatDuration(59_999)).toBe("60.0s");
  });

  it("formata minutos + segundos", () => {
    expect(formatDuration(72_000)).toBe("1m 12s");
    expect(formatDuration(3 * 60_000 + 5_000)).toBe("3m 5s");
  });
});
