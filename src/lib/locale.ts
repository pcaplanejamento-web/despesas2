// locale.ts — formatação + textos sensíveis a locale.
//
// Hoje sempre pt-BR / BRL. Esta camada centraliza tudo que muda quando
// adicionar outro idioma/moeda, evitando refactor "buscar e substituir"
// no codebase inteiro.
//
// Para adicionar locale (ex.: en-US/USD):
//   1. Adicione entrada em LOCALES (currency, decimal, months).
//   2. Implemente getLocaleId() lendo de user pref / browser / env.
//   3. Demais funções (formatCurrency, etc.) já leem getCurrentLocale().

export type LocaleId = "pt-BR";

export interface LocaleConfig {
  id: LocaleId;
  currency: string;            // ISO 4217 (BRL, USD, EUR)
  months: readonly string[];   // 12 nomes longos
  monthsAbbrev: readonly string[]; // 12 nomes abreviados (3 chars)
}

const LOCALES: Record<LocaleId, LocaleConfig> = {
  "pt-BR": {
    id: "pt-BR",
    currency: "BRL",
    months: [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
    ],
    monthsAbbrev: [
      "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
      "Jul", "Ago", "Set", "Out", "Nov", "Dez",
    ],
  },
};

const DEFAULT_LOCALE_ID: LocaleId = "pt-BR";

/**
 * Resolve o locale ativo. Hoje sempre default.
 * Futuro: user setting / browser navigator.language / env VITE_LOCALE_ID.
 */
function getLocaleId(): LocaleId {
  const envId = import.meta.env.VITE_LOCALE_ID;
  if (typeof envId === "string" && envId in LOCALES) return envId as LocaleId;
  return DEFAULT_LOCALE_ID;
}

let cachedLocale: LocaleConfig | null = null;

/** Retorna o LocaleConfig ativo. Memoizado por sessão. */
export function getCurrentLocale(): LocaleConfig {
  if (cachedLocale) return cachedLocale;
  cachedLocale = LOCALES[getLocaleId()];
  return cachedLocale;
}

// ══════════════════════════════════════════════════════════════
//  Formatters — todos respeitam getCurrentLocale()
// ══════════════════════════════════════════════════════════════

export function formatCurrency(value: number | string | null | undefined): string {
  const num = Number(value) || 0;
  const loc = getCurrentLocale();
  return num.toLocaleString(loc.id, { style: "currency", currency: loc.currency });
}

export function formatPercent(value: number | string | null | undefined): string {
  const num = Number(value) || 0;
  const loc = getCurrentLocale();
  return (num * 100).toLocaleString(loc.id, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
}

export function formatShort(value: number | string | null | undefined): string {
  const num = Number(value) || 0;
  const abs = Math.abs(num);
  const loc = getCurrentLocale();
  if (abs >= 1_000_000_000) return (num / 1_000_000_000).toLocaleString(loc.id, { maximumFractionDigits: 1 }) + "B";
  if (abs >= 1_000_000)     return (num / 1_000_000).toLocaleString(loc.id, { maximumFractionDigits: 1 }) + "M";
  if (abs >= 1_000)         return (num / 1_000).toLocaleString(loc.id, { maximumFractionDigits: 1 }) + "K";
  return num.toLocaleString(loc.id, { maximumFractionDigits: 0 });
}

/** Nome longo de mês 1-indexed (1=Jan, 12=Dez). */
export function getMonthName(month: number): string {
  const idx = month - 1;
  return getCurrentLocale().months[idx] ?? `Mês ${month}`;
}

/** Comparação locale-aware (sort de strings). */
export function compareLocale(a: unknown, b: unknown): number {
  return String(a ?? "").localeCompare(String(b ?? ""), getCurrentLocale().id);
}

// ══════════════════════════════════════════════════════════════
//  Re-exports para compat — consumers ainda usam `MESES` direto
// ══════════════════════════════════════════════════════════════

/** Array pt-BR-equivalente. Compat — prefira `getMonthName(m)` em código novo. */
export const MESES = LOCALES[DEFAULT_LOCALE_ID].months;

export type Mes = (typeof MESES)[number];
