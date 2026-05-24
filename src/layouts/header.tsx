import { Menu, Moon, RefreshCw, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";

interface HeaderProps {
  title: string;
  onMenuClick?: () => void;
  onRefresh?: () => void;
}

/**
 * Header superior. Em mobile mostra hamburguer pra abrir sidebar.
 * Exibe título da rota + status (importando, atualizado em X) + theme toggle.
 */
export function Header({ title, onMenuClick, onRefresh }: HeaderProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const status = useStore((s) => s.ui.headerStatus);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md">
      {onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          className={cn(
            "inline-flex size-9 items-center justify-center rounded-md",
            "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "lg:hidden",
          )}
          aria-label="Abrir menu"
        >
          <Menu className="size-4" />
        </button>
      )}
      <div className="flex flex-1 flex-col leading-tight">
        <h1 className="text-base font-semibold tracking-tight">{title}</h1>
        {status && (
          <span className="text-xs text-muted-foreground">{status}</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-md",
              "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            aria-label="Atualizar"
          >
            <RefreshCw className="size-4" />
          </button>
        )}
        <button
          type="button"
          onClick={toggleTheme}
          className={cn(
            "inline-flex size-9 items-center justify-center rounded-md",
            "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-label="Alternar tema"
        >
          {resolvedTheme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </button>
      </div>
    </header>
  );
}
