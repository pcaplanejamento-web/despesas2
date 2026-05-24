import { createHashRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/layouts/app-shell";
import { PainelPage } from "@/pages/painel";
import { TablePage } from "@/pages/table";
import { DattagoPage } from "@/pages/dattago";

/**
 * Hash router (createHashRouter) preserva URLs `#painel` etc. e funciona
 * com GitHub Pages em subpath sem precisar de 404.html.
 *
 * Cada rota de tabela compartilha o componente TablePage, parametrizado
 * pelo dataKey (path no store em `data.enriched.*`).
 */
export const router = createHashRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/painel" replace /> },
      { path: "painel", element: <PainelPage /> },
      {
        path: "empenhos",
        element: <TablePage title="Empenhos" dataKey="enriched.empenhos" />,
      },
      {
        path: "liquidacoes",
        element: <TablePage title="Liquidações" dataKey="enriched.liquidacoes" />,
      },
      {
        path: "pagamentos",
        element: <TablePage title="Pagamentos" dataKey="enriched.pagamentos" />,
      },
      {
        path: "orcamento",
        element: <TablePage title="Orçamento" dataKey="enriched.receita" />,
      },
      {
        path: "contratos",
        element: <TablePage title="Contratos" dataKey="enriched.contratos" />,
      },
      { path: "dattago", element: <DattagoPage /> },
      { path: "*", element: <Navigate to="/painel" replace /> },
    ],
  },
]);
