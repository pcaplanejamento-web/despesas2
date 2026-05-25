import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  CircleCheckBig,
  CreditCard,
  CircleDollarSign,
  FileSignature,
  Database,
  X,
} from "lucide-react";
import { getCurrentTenant } from "@/config/tenant";
import { useStore } from "@/store";
import { cn } from "@/lib/utils";

const NAV_MAIN = [
  { id: "painel",       label: "Painel",       icon: LayoutDashboard, to: "/painel" },
  { id: "empenhos",     label: "Empenhos",     icon: FileText,        to: "/empenhos" },
  { id: "liquidacoes",  label: "Liquidações",  icon: CircleCheckBig,  to: "/liquidacoes" },
  { id: "pagamentos",   label: "Pagamentos",   icon: CreditCard,      to: "/pagamentos" },
  { id: "orcamento",    label: "Orçamento",    icon: CircleDollarSign,to: "/orcamento" },
] as const;

const NAV_DOCS = [
  { id: "contratos",  label: "Contratos",    icon: FileSignature, to: "/contratos" },
  { id: "dattago",    label: "Integrações",  icon: Database,      to: "/dattago" },
] as const;

interface SidebarProps {
  /** Solid (default) ou translúcida (overlay/mobile). */
  variant?: "solid" | "translucent";
  /** Mostra botão fechar no topo (modo mobile). */
  onClose?: () => void;
  className?: string;
}

/**
 * Sidebar Dattago Moderno — 260px, glass com backdrop-blur, brand-mark com
 * SVG triangle + pulse animado, nav agrupada em seções (Main / Documentos),
 * exercise card no footer com ano + barra de progresso da execução.
 */
export function Sidebar({ variant = "solid", onClose, className }: SidebarProps) {
  const tenant = getCurrentTenant();
  const loadedYears = useStore((s) => s.data.loadedYears);
  const currentYear = new Date().getFullYear();
  const yearLoaded = loadedYears.has(currentYear);

  return (
    <aside
      className={cn(
        "flex h-full w-[260px] flex-col sticky top-0",
        "border-r border-[var(--border-strong)]",
        // glass effect — translúcido com backdrop-blur
        variant === "solid"
          ? "bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] backdrop-blur-[20px] backdrop-saturate-[160%]"
          : "bg-[color-mix(in_srgb,var(--surface)_70%,transparent)] backdrop-blur-[20px] backdrop-saturate-[160%]",
        "[&]:[backdrop-filter:blur(20px)_saturate(160%)]",
        className,
      )}
      style={{ height: "100vh" }}
    >
      {/* ── Brand ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-4 pt-[18px] pb-4 border-b border-[var(--border-soft)] min-h-[64px]">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--c-blue) 18%, var(--surface-3)), var(--surface-3))",
          }}
        >
          <svg viewBox="0 0 28 28" width="22" height="22" fill="none">
            <path d="M4 22 L14 4 L24 22 Z" fill="var(--c-blue)" />
            <circle cx="14" cy="16" r="3" fill="var(--surface)" />
          </svg>
        </div>
        <div className="flex min-w-0 flex-col gap-[2px]">
          <div className="text-[15px] font-semibold tracking-[-0.01em]">Dattago</div>
          <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--text-muted)]">
            <span
              className="size-1.5 rounded-full"
              style={{
                background: "var(--c-green)",
                animation: "brand-pulse 2s ease-out infinite",
              }}
            />
            <span>{tenant.displayName}</span>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "ml-auto inline-flex size-7 items-center justify-center rounded-[var(--radius-xs)]",
              "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden",
            )}
            aria-label="Fechar menu"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* ── Nav ───────────────────────────────────────────────── */}
      <nav className="flex flex-1 flex-col gap-[2px] overflow-y-auto p-3 px-2.5">
        {NAV_MAIN.map((item) => (
          <NavItem key={item.id} item={item} onClose={onClose} />
        ))}

        <div
          className="px-3 pb-1.5 pt-3.5 text-[10.5px] font-medium uppercase tracking-[0.07em] text-[var(--text-faint)]"
        >
          Documentos
        </div>

        {NAV_DOCS.map((item) => (
          <NavItem key={item.id} item={item} onClose={onClose} />
        ))}
      </nav>

      {/* ── Footer: exercise card ─────────────────────────────── */}
      <div className="flex flex-col gap-2.5 border-t border-[var(--border-soft)] px-2.5 pb-3.5 pt-3">
        <div
          className="rounded-[var(--radius-lg)] border p-3"
          style={{
            background: "var(--surface-2)",
            borderColor: "var(--border-soft)",
          }}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
            <span className="size-1.5 rounded-full" style={{ background: "var(--c-violet)" }} />
            <span>Exercício</span>
          </div>
          <div className="my-1 mt-1 mb-2 font-mono text-2xl font-medium tracking-[-0.02em] tabular-nums">
            {currentYear}
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: yearLoaded ? "100%" : "0%",
                background: "linear-gradient(90deg, var(--c-blue), var(--c-violet))",
              }}
            />
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[10.5px] text-[var(--text-muted)]">
            <span>{yearLoaded ? "Carregado" : "Aguardando…"}</span>
            <span>
              {new Date().toLocaleDateString("pt-BR", { month: "short", day: "2-digit" })}
            </span>
          </div>
        </div>

        <div className="px-2 pb-1 text-center text-[10.5px] text-[var(--text-muted)]">
          PCA Planejamento © {currentYear}
        </div>
      </div>
    </aside>
  );
}

// ── NavItem ─────────────────────────────────────────────────────

interface NavItemProps {
  item: { id: string; label: string; icon: typeof LayoutDashboard; to: string };
  onClose?: () => void;
}

function NavItem({ item, onClose }: NavItemProps) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      onClick={onClose}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3 rounded-[var(--radius-sm)] px-2.5 py-[9px]",
          "text-[13.5px] font-[450] transition-colors",
          "text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isActive && "bg-[var(--surface-3)] text-foreground font-[550]",
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              aria-hidden
              className="absolute -left-2.5 top-1.5 bottom-1.5 w-[3px] rounded-r-[3px]"
              style={{ background: "var(--c-blue)" }}
            />
          )}
          <Icon
            className={cn(
              "size-[17px] shrink-0",
              isActive ? "text-[var(--c-blue)]" : "text-[var(--text-muted)]",
            )}
            strokeWidth={1.7}
          />
          <span className="flex-1 truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}
