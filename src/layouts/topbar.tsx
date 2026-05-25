// TopBar Dattago Moderno — breadcrumb + busca global + bell + user-chip.
// Replica fiel do design: glass com backdrop-blur, kbd hint ⌘K, divider vertical.

import { useState } from "react";
import { Search, Bell, ChevronDown, Menu } from "lucide-react";
import { useStore } from "@/store";

interface TopBarProps {
  /** Lista de itens do breadcrumb. Último item = página atual. */
  breadcrumb: string[];
  /** Mostra busca global (default true). */
  search?: boolean;
  /** Handler do botão hamburguer (mobile). */
  onMenuClick?: () => void;
}

export function TopBar({ breadcrumb, search = true, onMenuClick }: TopBarProps) {
  const [query, setQuery] = useState("");
  const importing = useStore((s) => s.ui.importing);
  const headerStatus = useStore((s) => s.ui.headerStatus);

  return (
    <header className="topbar">
      <div className="topbar-left" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {onMenuClick && (
          <button
            type="button"
            className="ghost-btn lg:hidden"
            onClick={onMenuClick}
            aria-label="Abrir menu"
          >
            <Menu size={16} />
          </button>
        )}
        <nav className="breadcrumb">
          {breadcrumb.map((b, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              {i > 0 && <span className="bc-sep">/</span>}
              <span className={i === breadcrumb.length - 1 ? "bc-current" : "bc-item"}>{b}</span>
            </span>
          ))}
          {(importing || headerStatus) && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: 12, color: "var(--text-muted)", fontSize: 12 }}>
              <span className="bc-sep">·</span>
              <span>{headerStatus || "Importando…"}</span>
            </span>
          )}
        </nav>
      </div>

      <div className="topbar-right">
        {search && (
          <div className="topbar-search">
            <Search size={14} />
            <input
              placeholder="Buscar empenho, credor, contrato…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span className="kbd">⌘K</span>
          </div>
        )}
        <button className="icon-btn" title="Notificações" aria-label="Notificações">
          <Bell size={16} />
          <span className="icon-dot" />
        </button>
        <div className="topbar-divider" />
        <button className="user-chip" aria-label="Conta">
          <div className="avatar">RV</div>
          <div className="user-text">
            <div className="user-name">Servidor</div>
            <div className="user-role">Transparência</div>
          </div>
          <ChevronDown size={14} />
        </button>
      </div>
    </header>
  );
}
