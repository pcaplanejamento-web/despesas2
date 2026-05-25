import { lazy, Suspense } from "react";
import { createHashRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/layouts/app-shell";
import { ErrorBoundary } from "@/components/error-boundary";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Hash router (createHashRouter) preserva URLs `#painel` etc. e funciona
 * com GitHub Pages em subpath sem precisar de 404.html.
 *
 * Pages são lazy-loaded para code-splitting:
 *  - PainelPage isola chart.js + react-chartjs-2 (~150KB)
 *  - TablePage isola @tanstack/react-table (~50KB)
 *  - DattagoPage isola hooks de import (~10KB)
 *
 * Cada rota é envolvida por <ErrorBoundary> próprio — um crash numa Page não
 * derruba a Sidebar/Header, e o user vê uma UI amigável com "Tentar novamente".
 *
 * Cada rota de tabela compartilha o componente TablePage, parametrizado
 * pelo dataKey (path no store em `data.enriched.*`).
 */
const PainelPage = lazy(() =>
  import("@/pages/painel").then((m) => ({ default: m.PainelPage })),
);
const TablePage = lazy(() =>
  import("@/pages/table").then((m) => ({ default: m.TablePage })),
);
const DattagoPage = lazy(() =>
  import("@/pages/dattago").then((m) => ({ default: m.DattagoPage })),
);

/** Fallback durante carregamento de chunk lazy. Layout consistente com pages. */
function PageFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-48" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

/**
 * Wrapper que injeta ErrorBoundary + Suspense em cada rota.
 * label aparece na UI de erro p/ o user identificar a página.
 */
function R({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <ErrorBoundary label={label}>
      <Suspense fallback={<PageFallback />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

export const router = createHashRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/painel" replace /> },
      { path: "painel", element: <R label="Painel"><PainelPage /></R> },
      {
        path: "empenhos",
        element: <R label="Empenhos"><TablePage title="Empenhos" dataKey="enriched.empenhos" /></R>,
      },
      {
        path: "liquidacoes",
        element: <R label="Liquidações"><TablePage title="Liquidações" dataKey="enriched.liquidacoes" /></R>,
      },
      {
        path: "pagamentos",
        element: <R label="Pagamentos"><TablePage title="Pagamentos" dataKey="enriched.pagamentos" /></R>,
      },
      {
        path: "orcamento",
        element: <R label="Orçamento"><TablePage title="Orçamento" dataKey="enriched.receita" /></R>,
      },
      {
        path: "contratos",
        element: <R label="Contratos"><TablePage title="Contratos" dataKey="enriched.contratos" /></R>,
      },
      { path: "dattago", element: <R label="Integrações"><DattagoPage /></R> },
      { path: "*", element: <Navigate to="/painel" replace /> },
    ],
  },
]);
