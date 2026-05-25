// KpiCard Dattago Moderno — replica fiel do design (components.jsx KpiCard).
// Estrutura: head (label + delta-pill) → value mono → exact line → sparkline full-width
//            → footer (trend line + sub).

import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkline, type SparklineColor } from "@/components/sparkline";
import { formatCurrency } from "@/lib/config";
import { cn } from "@/lib/utils";

// "primary"/"emerald" mantidos como aliases pra compat.
type Accent = "blue" | "green" | "emerald" | "teal" | "amber" | "rose" | "violet" | "primary";

interface KpiCardProps {
  label: string;
  value: number | null;
  /** Ícone Lucide — usado quando NÃO há delta (no header). */
  icon?: LucideIcon;
  /** Tom do data-accent (Dattago Moderno paleta). */
  accent?: Accent;
  /** Delta percentual em decimal: 0.085 = +8.5%. Se omitido, esconde pill. */
  delta?: number | null;
  /** Série pra sparkline. Pelo menos 2 pontos. */
  series?: number[];
  /** Subtitle de detalhe (ex.: "vs mês anterior"). */
  sub?: string;
  /** Valor "exato" abaixo do mono (ex.: R$ 1.234.567,89). Default usa formatCurrency. */
  exact?: string;
  /** Override do trend line. Default: deriva do delta. */
  trendLine?: string;
  /** Loading state. */
  loading?: boolean;
  onClick?: () => void;
}

const ACCENT_TO_SPARK: Record<Accent, SparklineColor> = {
  primary: "blue",
  blue:    "blue",
  green:   "green",
  emerald: "green",
  teal:    "teal",
  amber:   "amber",
  rose:    "rose",
  violet:  "violet",
};

export function KpiCard({
  label,
  value,
  icon: Icon,
  accent = "blue",
  delta,
  series,
  sub,
  exact,
  trendLine,
  loading,
  onClick,
}: KpiCardProps) {
  const sparkColor = ACCENT_TO_SPARK[accent];
  const hasDelta = typeof delta === "number" && Number.isFinite(delta) && delta !== 0;
  const positive = (delta ?? 0) >= 0;
  const neutral = !hasDelta;

  const computedTrend =
    trendLine ??
    (neutral
      ? "Estável no período"
      : positive
        ? "Tendência de alta este mês"
        : "Queda no período");

  const displayValue = value !== null ? formatCurrency(value) : "—";
  const exactValue = exact ?? (value !== null && value >= 1_000_000 ? formatCurrency(value) : null);

  return (
    <div
      className={cn("kpi-card", onClick && "cursor-pointer")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="kpi-head">
        <div className="kpi-label">{label}</div>
        {hasDelta ? (
          <span className={`kpi-delta-pill ${positive ? "is-up" : "is-down"}`}>
            {positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {positive ? "+" : "−"}
            {Math.abs(delta!).toFixed(1)}%
          </span>
        ) : Icon ? (
          <Icon size={16} strokeWidth={1.7} style={{ color: `var(--c-${sparkColor})` }} />
        ) : null}
      </div>

      {loading ? (
        <Skeleton className="my-1 h-8 w-32" />
      ) : (
        <div className="kpi-value mono">{displayValue}</div>
      )}

      {exactValue && !loading && <div className="kpi-exact mono">{exactValue}</div>}

      {series && series.length >= 2 && (
        <div className="kpi-spark">
          <Sparkline data={series} color={sparkColor} fill stretch />
        </div>
      )}

      <div className="kpi-foot">
        <div className="kpi-trend">
          {computedTrend}
          {hasDelta && (
            <span className={`kpi-trend-icon ${positive ? "is-up" : "is-down"}`}>
              {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            </span>
          )}
        </div>
        {sub && <div className="kpi-sub">{sub}</div>}
      </div>
    </div>
  );
}
