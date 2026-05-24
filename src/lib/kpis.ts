// kpis.ts — definições dos 6 cards KPI do painel.
//
// Port de assets/js/core/kpis.js: apenas as definições (KPI_DEFS) e tipos.
// A função renderKpis() do legado (DOM-heavy) NÃO foi portada — será
// re-implementada em V8 como componente React <KpiCard>.
//
// Os nomes de ícones foram migrados de tokens internos do design system
// vanilla para os nomes do lucide-react (consumidos em <KpiCard> via
// `<Icon />` dinâmico em React).

import type { KpiResults } from './compute';

/** Variante visual do card no design system Vega (mantém paridade com o legacy). */
export type KpiGradient = 'blue' | 'green' | 'teal' | 'rose' | 'amber' | 'purple';

/** Chave numérica do KPI dentro de `KpiResults` (valor exibido na linha middle). */
export type KpiKey =
  | 'empenhado'
  | 'liquidado'
  | 'pago'
  | 'anulado'
  | 'retido'
  | 'pctLiquidado';

/** Chave de contagem usada na linha bottom do card (qty). */
export type KpiQtyKey = Extract<keyof KpiResults,
  | 'qtdEmpenhos'
  | 'qtdLiquidacoes'
  | 'qtdPagamentos'
  | 'qtdAnulados'
  | 'qtdRetidos'
>;

export interface KpiDef {
  /** Chave que liga o card ao valor numérico em `KpiResults` (e ao data-kpi do legacy). */
  key:      KpiKey;
  /** Label exibido no topo do card. */
  label:    string;
  /** Nome do ícone lucide-react (ex.: 'Wallet', 'FileText'). Carregar dinamicamente em <KpiCard>. */
  icon:     string;
  /** Variante visual no design system (gradiente do background do ícone). */
  gradient: KpiGradient;
  /** Chave da contagem em `KpiResults` (para linha "N empenhos"). */
  qtyKey:   KpiQtyKey;
  /** Singular usado quando qty === 1. */
  qtySing:  string;
  /** Plural usado quando qty !== 1. */
  qtyPlur:  string;
  /** Se true, formata o valor como percentual (1.0 → 100%). Default false (moeda). */
  pct?:     boolean;
}

/**
 * Definição dos 6 KPIs exibidos no Painel.
 *
 * Ícones — mapeamento de tokens do legado → lucide-react:
 *   - 'file'      → 'File'        (Total Empenhado)
 *   - 'file-text' → 'FileText'    (Total Liquidado)
 *   - 'card'      → 'CreditCard'  (Total Pago)
 *   - 'alert'     → 'AlertCircle' (Total Anulado)
 *   - 'calendar'  → 'Calendar'    (Total Retido)
 *   - 'trend'     → 'TrendingUp'  (% Liquidado / Empenhado)
 */
export const KPI_DEFS = [
  { key: 'empenhado',    label: 'Total Empenhado',    gradient: 'blue',   icon: 'File',
    qtyKey: 'qtdEmpenhos',    qtySing: 'empenho',        qtyPlur: 'empenhos' },
  { key: 'liquidado',    label: 'Total Liquidado',    gradient: 'green',  icon: 'FileText',
    qtyKey: 'qtdLiquidacoes', qtySing: 'liquidação',     qtyPlur: 'liquidações' },
  { key: 'pago',         label: 'Total Pago',         gradient: 'teal',   icon: 'CreditCard',
    qtyKey: 'qtdPagamentos',  qtySing: 'ordem de pgto.', qtyPlur: 'ordens de pgto.' },
  { key: 'anulado',      label: 'Total Anulado',      gradient: 'rose',   icon: 'AlertCircle',
    qtyKey: 'qtdAnulados',    qtySing: 'registro',       qtyPlur: 'registros' },
  { key: 'retido',       label: 'Total Retido',       gradient: 'amber',  icon: 'Calendar',
    qtyKey: 'qtdRetidos',     qtySing: 'retenção',       qtyPlur: 'retenções' },
  { key: 'pctLiquidado', label: '% Liquidado / Emp.', gradient: 'purple', icon: 'TrendingUp', pct: true,
    qtyKey: 'qtdEmpenhos',    qtySing: 'empenho',        qtyPlur: 'empenhos' },
] as const satisfies readonly KpiDef[];
