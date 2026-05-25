// config.ts — constantes globais e utilitários genéricos.
//
// Formatação e textos sensíveis a locale (MESES, formatCurrency, etc.)
// ficam em `lib/locale.ts` e são re-exportados aqui para compat —
// consumers podem importar de `config` OU `locale` indistintamente.
//
// Pra adicionar idioma, edite só `lib/locale.ts`.

export const PAGE_SIZE = 50;

export const SECTION_TITLES = {
  painel:        "Painel",
  demonstrativo: "Demonstrativo",
  empenhos:      "Empenhos",
  liquidacoes:   "Liquidações",
  pagamentos:    "Pagamentos",
  orcamento:     "Orçamento",
  contratos:     "Contratos",
  dattago:       "Integrações",
} as const;

export type SectionKey = keyof typeof SECTION_TITLES;

export function truncateLabel(str: string | null | undefined, max = 40): string {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + "…" : str;
}

export function escHtml(s: unknown): string {
  return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

export function normalizeSearch(s: unknown): string {
  return String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
}

// ── Re-exports de locale (compat — código existente importa daqui) ──
export {
  MESES,
  type Mes,
  formatCurrency,
  formatPercent,
  formatShort,
  compareLocale as compareValues,
  getMonthName,
  getCurrentLocale,
} from "./locale";
