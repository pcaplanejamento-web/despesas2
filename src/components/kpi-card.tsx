import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/config";
import { cn } from "@/lib/utils";

// "emerald" mantido como alias de "green" pra compat com callers existentes.
type Accent = "blue" | "green" | "emerald" | "teal" | "amber" | "rose" | "violet" | "primary";

interface KpiCardProps {
  label: string;
  value: number | null;
  icon: LucideIcon;
  /** Tom do data-accent (Dattago Moderno paleta). */
  accent?: Accent;
  /** Delta percentual (positivo = subiu, negativo = caiu). Mostra pill se definido. */
  delta?: number | null;
  /** Subtitle opcional (ex.: contador de registros). */
  sub?: string;
  /** Loading state. */
  loading?: boolean;
  onClick?: () => void;
}

const ACCENT_VAR: Record<Accent, string> = {
  primary: "var(--c-blue)",
  blue:    "var(--c-blue)",
  green:   "var(--c-green)",
  emerald: "var(--c-green)",
  teal:    "var(--c-teal)",
  amber:   "var(--c-amber)",
  rose:    "var(--c-rose)",
  violet:  "var(--c-violet)",
};

/**
 * KpiCard Dattago Moderno — glass card translúcido com inset highlight no topo,
 * label + delta pill no header, valor monetário grande (clamp), ícone à direita
 * pintado com o accent. Hover lift sutil + border highlight.
 */
export function KpiCard({
  label,
  value,
  icon: Icon,
  accent = "blue",
  delta,
  sub,
  loading,
  onClick,
}: KpiCardProps) {
  const accentColor = ACCENT_VAR[accent];
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const isUp = hasDelta && (delta as number) >= 0;

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "glass-card group relative flex flex-col gap-1 px-5 pb-3.5 pt-4",
        "transition-[border-color,transform] duration-200",
        onClick && "cursor-pointer hover:-translate-y-px hover:border-[var(--text-faint)]",
      )}
    >
      {/* Head: label + delta pill (ou ícone se sem delta) */}
      <div className="relative z-[1] flex items-center justify-between gap-3">
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-[450] tracking-[-0.005em] text-[var(--text-muted)]">
          {label}
        </span>
        {hasDelta ? (
          <span
            className={cn(
              "inline-flex items-center gap-[3px] rounded-full border border-border bg-[var(--surface-2)] px-2 py-[3px]",
              "whitespace-nowrap font-mono text-[11px] font-medium text-[var(--text-2)]",
            )}
          >
            {isUp ? (
              <ArrowUpRight className="size-3" style={{ color: "var(--c-green)" }} />
            ) : (
              <ArrowDownRight className="size-3" style={{ color: "var(--c-rose)" }} />
            )}
            {isUp ? "+" : ""}
            {((delta as number) * 100).toFixed(1)}%
          </span>
        ) : (
          <Icon
            className="size-4 shrink-0"
            style={{ color: accentColor }}
            strokeWidth={1.7}
          />
        )}
      </div>

      {/* Valor */}
      <div className="relative z-[1] mt-1.5">
        {loading ? (
          <Skeleton className="h-9 w-36" />
        ) : (
          <div
            className="overflow-hidden whitespace-nowrap font-semibold leading-[1.05] tabular-nums tracking-[-0.03em]"
            style={{ fontSize: "clamp(20px, 2.2vw, 32px)" }}
          >
            {value !== null ? formatCurrency(value) : "—"}
          </div>
        )}
      </div>

      {/* Footer: sub */}
      {sub && (
        <div className="relative z-[1] mt-1 text-[12px] leading-[1.4] text-[var(--text-muted)]">
          {sub}
        </div>
      )}
    </div>
  );
}
