import { lazy, Suspense } from "react";
import { createHashRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/layouts/app-shell";
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

/** Wrapper que injeta Suspense — evita repetir o boilerplate em cada rota. */
function L({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

export const router = createHashRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/painel" replace /> },
      { path: "painel", element: <L><PainelPage /></L> },
      {
        path: "empenhos",
        element: <L><TablePage title="Empenhos" dataKey="enriched.empenhos" /></L>,
      },
      {
        path: "liquidacoes",
        element: <L><TablePage title="Liquidações" dataKey="enriched.liquidacoes" /></L>,
      },
      {
        path: "pagamentos",
        element: <L><TablePage title="Pagamentos" dataKey="enriched.pagamentos" /></L>,
      },
      {
        path: "orcamento",
        element: <L><TablePage title="Orçamento" dataKey="enriched.receita" /></L>,
      },
      {
        path: "contratos",
        element: <L><TablePage title="Contratos" dataKey="enriched.contratos" /></L>,
      },
      { path: "dattago", element: <L><DattagoPage /></L> },
      { path: "*", element: <Navigate to="/painel" replace /> },
    ],
  },
]);
