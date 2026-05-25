import { Check, Menu, Monitor, Moon, RefreshCw, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";

interface HeaderProps {
  title: string;
  onMenuClick?: () => void;
  onRefresh?: () => void;
}

/**
 * Header superior. Em mobile mostra hamburguer pra abrir sidebar.
 * Exibe título da rota + status (importando, atualizado em X) + theme dropdown.
 */
export function Header({ title, onMenuClick, onRefresh }: HeaderProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-md",
                "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label="Alterar tema"
            >
              {theme === "system" ? (
                <Monitor className="size-4" />
              ) : resolvedTheme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-36">
            <DropdownMenuLabel>Tema</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setTheme("light")}>
              <Sun className="mr-2 size-4" />
              Claro
              {theme === "light" && <Check className="ml-auto size-4" />}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setTheme("dark")}>
              <Moon className="mr-2 size-4" />
              Escuro
              {theme === "dark" && <Check className="ml-auto size-4" />}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setTheme("system")}>
              <Monitor className="mr-2 size-4" />
              Sistema
              {theme === "system" && <Check className="ml-auto size-4" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
