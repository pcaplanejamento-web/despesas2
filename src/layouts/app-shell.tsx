import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SECTION_TITLES } from "@/lib/config";
import { Sidebar } from "@/layouts/sidebar";
import { Header } from "@/layouts/header";
import { useAutoImport } from "@/hooks/use-auto-import";
import { cn } from "@/lib/utils";

/**
 * Shell raiz do app. Sidebar fixa em desktop (≥lg), Sheet translúcida em
 * mobile. Header sticky no topo. <Outlet/> renderiza a rota ativa.
 */
export function AppShell() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Auto-importa o ano corrente no primeiro mount (legacy behavior)
  useAutoImport();

  // Resolve título a partir da rota atual
  const route = location.pathname.replace(/^\//, "") || "painel";
  const title = SECTION_TITLES[route as keyof typeof SECTION_TITLES] ?? "Dattago";

  // Fecha drawer mobile ao trocar de rota
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-svh bg-background text-foreground">
      {/* Sidebar desktop (≥lg) */}
      <div className="hidden lg:block">
        <Sidebar variant="solid" />
      </div>

      {/* Sidebar mobile (Sheet translúcida) */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div
            className={cn(
              "fixed inset-y-0 left-0 z-40 lg:hidden",
              "animate-in slide-in-from-left duration-200",
            )}
          >
            <Sidebar
              variant="translucent"
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Header title={title} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
