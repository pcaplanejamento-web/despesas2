import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/config";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: number | null;
  icon: LucideIcon;
  /** Tom do gradient/accent (Tailwind classes). */
  accent?: "primary" | "blue" | "emerald" | "violet" | "amber" | "rose" | "teal";
  /** Subtitle opcional (ex.: contador de registros). */
  sub?: string;
  /** Loading state. */
  loading?: boolean;
  onClick?: () => void;
}

const ACCENT_CLASSES: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  primary: "from-primary/15 to-primary/5 text-primary",
  blue:    "from-blue-500/15 to-blue-500/5 text-blue-600 dark:text-blue-400",
  emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
  violet:  "from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-400",
  amber:   "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400",
  rose:    "from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-400",
  teal:    "from-teal-500/15 to-teal-500/5 text-teal-600 dark:text-teal-400",
};

/**
 * KPI card — gradient sutil + ícone Lucide + valor monetário grande.
 * Estilo Vercel/Linear: sombra discreta, bordas finas, hover lift sutil.
 */
export function KpiCard({
  label,
  value,
  icon: Icon,
  accent = "primary",
  sub,
  loading,
  onClick,
}: KpiCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "relative overflow-hidden transition-all",
        onClick && "cursor-pointer hover:border-foreground/20 hover:shadow-md",
      )}
    >
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br pointer-events-none",
          ACCENT_CLASSES[accent],
        )}
      />
      <div className="relative space-y-2 p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <Icon className={cn("size-4", ACCENT_CLASSES[accent].split(" ").slice(-1)[0])} />
        </div>
        {loading ? (
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        ) : (
          <div className="text-2xl font-semibold tabular-nums tracking-tight">
            {value !== null ? formatCurrency(value) : "—"}
          </div>
        )}
        {sub && (
          <div className="text-xs text-muted-foreground">{sub}</div>
        )}
      </div>
    </Card>
  );
}
