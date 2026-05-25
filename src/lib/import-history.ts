// import-history.ts — persistência de logs de importação em localStorage.
//
// Cada `run` do useImportDattago grava 1 entry com timestamps, ano, totais
// por API, fromCache, e duração. Últimas 20 entries são mantidas.
//
// Por que existir: ImportLog (em dattago-core) é por-sessão e se perde no reload.
// Esta camada complementa, persistindo agregados leves p/ debug histórico
// ("a importação do dia X foi lenta?", "qual API mais falha?").

const STORAGE_KEY = "dattago_import_history_v1";
const MAX_ENTRIES = 20;

export type ImportStatus = "done" | "error";

export interface ImportHistoryEntry {
  /** ISO 8601 do início. */
  startedAt: string;
  /** Duração em ms. */
  durationMs: number;
  /** Ano importado. */
  year: number;
  /** Quantos registros por API. */
  perApi: Record<string, number>;
  /** Total agregado. */
  totalRegistros: number;
  /** Se a importação veio 100% do cache. */
  fromCache: boolean;
  /** Status final. */
  status: ImportStatus;
  /** Mensagem de erro se status === "error". */
  error?: string;
}

/**
 * Lê o histórico completo (ordenado: mais recente primeiro).
 * Silencia falhas de parse / quota.
 */
export function readImportHistory(): ImportHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ImportHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Anexa uma entry ao histórico, mantendo só as últimas MAX_ENTRIES.
 * Mais recente fica no índice 0.
 */
export function recordImportHistory(entry: ImportHistoryEntry): void {
  try {
    const current = readImportHistory();
    const next = [entry, ...current].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (e: unknown) {
    // Quota cheia ou similar — silenciar, não é crítico
    const err = e as { name?: string } | null;
    if (err?.name === "QuotaExceededError") {
      console.warn("[import-history] localStorage cheio, histórico não gravado");
    }
  }
}

/**
 * Limpa todo o histórico — chamado por `clearDattagoCache` indiretamente.
 */
export function clearImportHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* silenciar */
  }
}

/**
 * Helper p/ formatação de duração legível (ms → "2.3s" / "45ms" / "1m 12s").
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const min = Math.floor(ms / 60_000);
  const sec = Math.round((ms % 60_000) / 1000);
  return `${min}m ${sec}s`;
}
