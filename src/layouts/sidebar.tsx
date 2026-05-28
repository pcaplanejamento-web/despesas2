// Sidebar Dattago Moderno — replica fiel do design.
// Brand mark SVG triangle + brand-pulse, nav items com badge + rail no ativo,
// section "Documentos", footer com exercise-card + ghost-btn (theme + collapse).

import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  CircleCheckBig,
  CreditCard,
  CircleDollarSign,
  FileSignature,
  Database,
  Sun,
  Moon,
  PanelLeftClose,
  X,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { BrandLogoIcon } from "@/components/brand-logo";
import { getCurrentTenant } from "@/config/tenant";
import { useStore } from "@/store";

interface NavItemDef {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  to: string;
  badge?: string;
}

const NAV_MAIN: NavItemDef[] = [
  { id: "painel",      label: "Painel",       icon: LayoutDashboard, to: "/painel" },
  { id: "empenhos",    label: "Empenhos",     icon: FileText,        to: "/empenhos" },
  { id: "liquidacoes", label: "Liquidações",  icon: CircleCheckBig,  to: "/liquidacoes" },
  { id: "pagamentos",  label: "Pagamentos",   icon: CreditCard,      to: "/pagamentos" },
  { id: "orcamento",   label: "Orçamento",    icon: CircleDollarSign,to: "/orcamento" },
];

const NAV_DOCS: NavItemDef[] = [
  { id: "contratos", label: "Contratos",   icon: FileSignature, to: "/contratos" },
  { id: "dattago",   label: "Integrações", icon: Database,      to: "/dattago" },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onClose?: () => void;
}

export function Sidebar({ collapsed = false, onToggleCollapse, onClose }: SidebarProps) {
  const tenant = getCurrentTenant();
  const { resolvedTheme, setTheme } = useTheme();
  const empCount = useStore((s) => s.data.painel.emp.length);

  const empBadge = empCount > 1000
    ? `${(empCount / 1000).toFixed(1).replace(".", ",")}k`
    : empCount > 0
      ? String(empCount)
      : undefined;

  return (
    <aside className={`sidebar ${collapsed ? "is-collapsed" : ""}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-mark">
          <BrandLogoIcon />
        </div>
        {!collapsed && (
          <div className="brand-text">
            <div className="brand-name">Dattago</div>
            <div className="brand-meta">
              <span className="brand-pulse" />
              <span>{tenant.displayName}</span>
            </div>
          </div>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ghost-btn ml-auto lg:hidden"
            aria-label="Fechar menu"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV_MAIN.map((it) => (
          <NavItem
            key={it.id}
            item={{
              ...it,
              badge: it.id === "empenhos" ? empBadge : it.badge,
            }}
            collapsed={collapsed}
            onClose={onClose}
          />
        ))}

        {!collapsed && <div className="nav-label-section">Documentos</div>}
        {NAV_DOCS.map((it) => (
          <NavItem key={it.id} item={it} collapsed={collapsed} onClose={onClose} />
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {!collapsed && <ExerciseCard />}

        <div className="sidebar-controls">
          <button
            className="ghost-btn"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            title="Alternar tema"
          >
            {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {onToggleCollapse && (
            <button
              className="ghost-btn"
              onClick={onToggleCollapse}
              title="Recolher"
            >
              <PanelLeftClose
                size={16}
                style={{ transform: collapsed ? "rotate(180deg)" : "none" }}
              />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

// ── NavItem ────────────────────────────────────────────────────

function NavItem({
  item,
  collapsed,
  onClose,
}: {
  item: NavItemDef;
  collapsed: boolean;
  onClose?: () => void;
}) {
  const Icon = item.icon;
  const location = useLocation();
  const active = location.pathname.startsWith(item.to);
  return (
    <NavLink
      to={item.to}
      onClick={onClose}
      className={`nav-item ${active ? "is-active" : ""}`}
      title={collapsed ? item.label : undefined}
    >
      {active && <span className="nav-rail" />}
      <span className="nav-icon"><Icon size={17} strokeWidth={1.7} /></span>
      {!collapsed && <span className="nav-label">{item.label}</span>}
      {!collapsed && item.badge && <span className="nav-badge">{item.badge}</span>}
    </NavLink>
  );
}

// ── Exercise card (no footer) ──────────────────────────────────

function ExerciseCard() {
  const currentYear = new Date().getFullYear();
  const loadedYears = useStore((s) => s.data.loadedYears);
  const yearLoaded = loadedYears.has(currentYear);

  // Aproxima execução baseado em quantos meses do ano passaram
  const now = new Date();
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);
  const elapsedPct = Math.min(
    100,
    Math.max(0, ((now.getTime() - startOfYear.getTime()) / (endOfYear.getTime() - startOfYear.getTime())) * 100),
  );

  return (
    <div className="exercise-card">
      <div className="exercise-head">
        <span className="exercise-dot" />
        <span>Exercício</span>
      </div>
      <div className="exercise-year mono">{currentYear}</div>
      <div className="exercise-progress">
        <div
          className="exercise-progress-bar"
          style={{ width: `${yearLoaded ? elapsedPct.toFixed(0) : 0}%` }}
        />
      </div>
      <div className="exercise-meta mono">
        <span>{yearLoaded ? `${elapsedPct.toFixed(0)}% do ano` : "Aguardando…"}</span>
        <span>
          {now.toLocaleDateString("pt-BR", { month: "short", day: "2-digit" })}
        </span>
      </div>
    </div>
  );
}
