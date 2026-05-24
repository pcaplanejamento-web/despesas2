// config.ts — constantes globais e utilitários de formatação
// Port de assets/js/core/config.js (V2 — business logic puro).

export const PAGE_SIZE = 50;

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const;

export type Mes = (typeof MESES)[number];

export const SECTION_TITLES = {
  painel:        'Painel',
  demonstrativo: 'Demonstrativo',
  empenhos:      'Empenhos',
  liquidacoes:   'Liquidações',
  pagamentos:    'Pagamentos',
  orcamento:     'Orçamento',
  contratos:     'Contratos',
  dattago:       'Integrações',
} as const;

export type SectionKey = keyof typeof SECTION_TITLES;

export function formatCurrency(value: number | string | null | undefined): string {
  const num = Number(value) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatPercent(value: number | string | null | undefined): string {
  const num = Number(value) || 0;
  return (num * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
}

export function truncateLabel(str: string | null | undefined, max = 40): string {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

export function formatShort(value: number | string | null | undefined): string {
  const num = Number(value) || 0;
  const abs = Math.abs(num);
  if (abs >= 1_000_000_000) return (num / 1_000_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'B';
  if (abs >= 1_000_000)     return (num / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'M';
  if (abs >= 1_000)         return (num / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'K';
  return num.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

/* ── Utilitários compartilhados (uso em tables.js, dattago-tables.js) ── */
export function escHtml(s: unknown): string {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
export function normalizeSearch(s: unknown): string {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
}
export function compareValues(va: unknown, vb: unknown): number {
  const na = Number(va), nb = Number(vb);
  if (!isNaN(na) && !isNaN(nb)) return na - nb;
  return String(va ?? '').localeCompare(String(vb ?? ''), 'pt-BR');
}
