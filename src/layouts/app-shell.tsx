// AppShell Dattago Moderno — grid 260px (collapsed 64px) + main com radial bg.
// Sidebar sticky, TopBar dentro de cada screen via `.topbar` (margem negativa).
//
// O design colide o topbar dentro de cada screen pra mantê-lo full-width
// mesmo com padding lateral — replicamos isso passando o TopBar pra cada Page.
// AppShell só monta sidebar + outlet + estado collapse.

import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "@/layouts/sidebar";
import { useAutoImport } from "@/hooks/use-auto-import";
import { cn } from "@/lib/utils";

export function AppShell() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  useAutoImport();

  // Fecha drawer mobile ao trocar de rota (safety net pra back/forward browser)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className={`app ${collapsed ? "is-collapsed" : ""}`}>
      {/* Sidebar desktop (≥lg) */}
      <div className="hidden lg:contents">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />
      </div>

      {/* Sidebar mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div
            className={cn(
              "fixed inset-y-0 left-0 z-40 lg:hidden",
              "animate-in slide-in-from-left duration-200",
            )}
          >
            <Sidebar onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      {/* Main column — grid item 2 */}
      <main className="main" data-mobile-open={mobileOpen ? "true" : "false"}>
        <Outlet context={{ openMobileMenu: () => setMobileOpen(true) }} />
      </main>
    </div>
  );
}
