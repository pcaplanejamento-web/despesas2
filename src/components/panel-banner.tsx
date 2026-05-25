// PainelHeader — banner gradient com grid pattern + timestamp + actions.
// Replica fiel do design (PainelHeader em components.jsx).

import { Sun, Moon, RefreshCw } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

interface PanelBannerProps {
  /** Título grande no banner. */
  title?: string;
  /** Subtítulo (default: "Atualizado em <timestamp>"). */
  sub?: string;
  /** Handler do refresh button (geralmente re-import). */
  onRefresh?: () => void;
  /** Mostra botão de toggle de tema. Default true. */
  showThemeToggle?: boolean;
  /** Render adicional na esquerda (após título). */
  children?: React.ReactNode;
}

export function PanelBanner({
  title = "Painel",
  sub,
  onRefresh,
  showThemeToggle = true,
  children,
}: PanelBannerProps) {
  const { resolvedTheme, setTheme } = useTheme();

  const timestamp = new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const finalSub = sub ?? `Atualizado em ${timestamp}`;

  return (
    <div className="panel-banner">
      <div className="panel-banner-grid" />
      <div className="panel-banner-content">
        <div>
          <h1 className="panel-banner-title">{title}</h1>
          <div className="panel-banner-sub">{finalSub}</div>
          {children}
        </div>
        <div className="panel-banner-actions">
          {showThemeToggle && (
            <button
              type="button"
              className="banner-icon-btn"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              title="Alternar tema"
              aria-label="Alternar tema"
            >
              {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}
          {onRefresh && (
            <button
              type="button"
              className="banner-icon-btn"
              onClick={onRefresh}
              title="Atualizar"
              aria-label="Atualizar"
            >
              <RefreshCw size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
