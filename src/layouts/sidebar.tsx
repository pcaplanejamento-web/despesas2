import { NavLink } from "react-router-dom";
import {
  LayoutGrid,
  FileText,
  Receipt,
  CreditCard,
  DollarSign,
  FileBadge,
  Database,
  X,
} from "lucide-react";
import { getCurrentTenant } from "@/config/tenant";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { id: "painel",       label: "Painel",       icon: LayoutGrid,   to: "/painel" },
  { id: "empenhos",     label: "Empenhos",     icon: FileText,     to: "/empenhos" },
  { id: "liquidacoes",  label: "Liquidações",  icon: Receipt,      to: "/liquidacoes" },
  { id: "pagamentos",   label: "Pagamentos",   icon: CreditCard,   to: "/pagamentos" },
  { id: "orcamento",    label: "Orçamento",    icon: DollarSign,   to: "/orcamento" },
  { id: "contratos",    label: "Contratos",    icon: FileBadge,    to: "/contratos" },
  { id: "dattago",      label: "Integrações",  icon: Database,     to: "/dattago" },
] as const;

interface SidebarProps {
  /** Solid (default) ou translúcida (overlay/mobile). */
  variant?: "solid" | "translucent";
  /** Mostra botão fechar no topo (modo mobile). */
  onClose?: () => void;
  className?: string;
}

/**
 * Sidebar lateral do app. Lista as 7 rotas. Variant 'translucent' usa
 * backdrop-blur para overlay sobre conteúdo (mobile Sheet).
 */
export function Sidebar({ variant = "solid", onClose, className }: SidebarProps) {
  const tenant = getCurrentTenant();
  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col border-r",
        variant === "solid"
          ? "bg-sidebar text-sidebar-foreground"
          : "bg-sidebar/80 text-sidebar-foreground backdrop-blur-md",
        className,
      )}
    >
      {/* Brand */}
      <div className="flex h-14 items-center justify-between gap-2 border-b px-4">
        <div className="flex items-center gap-2">
          <img
            src={`${import.meta.env.BASE_URL}foguete.svg`}
            alt="Dattago"
            className="size-6 shrink-0"
          />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">Dattago</span>
            <span className="text-xs text-muted-foreground">{tenant.displayName}</span>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-md",
              "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden",
            )}
            aria-label="Fechar menu"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                isActive &&
                  "bg-sidebar-accent text-sidebar-accent-foreground",
              )
            }
          >
            <item.icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t px-4 py-3 text-xs text-muted-foreground">
        PCA Planejamento © {new Date().getFullYear()}
      </div>
    </aside>
  );
}
