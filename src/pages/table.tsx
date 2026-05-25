// TablePage — Page genérica reusada pelas 5 rotas de listagem:
//   /empenhos /liquidacoes /pagamentos /orcamento /contratos
// Replica fiel do design (screens.jsx ScreenEmpenhos):
//   TopBar(breadcrumb) → page-head(title+desc+actions) → tabs(status) →
//   table-toolbar(search+summary+filters) → table-wrap(data-table) → pagination.

import { useMemo, useState } from "react";
import { Database, Download, Plus } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { TopBar } from "@/layouts/topbar";
import { DataTable, type ColumnSpec } from "@/components/data-table";
import { formatCurrency } from "@/lib/config";
import { parseDDMMYYYY } from "@/lib/compute";
import { useStore } from "@/store";

type AppShellCtx = { openMobileMenu: () => void };

// ══════════════════════════════════════════════════════════════
//  Column specs por dataKey
// ══════════════════════════════════════════════════════════════

type AnyRow = ReadonlyArray<string | number | null>;

const COLS_EMP: ColumnSpec<AnyRow>[] = [
  { key: 0, label: "Data" },
  { key: 1, label: "Órgão" },
  { key: 2, label: "Credor" },
  { key: 3, label: "CPF/CNPJ" },
  { key: 5, label: "Nº Empenho" },
  { key: 11, label: "Ação" },
  { key: 12, label: "Elemento" },
  { key: 15, label: "Empenhado", align: "right", format: formatCurrency, sum: true },
  { key: 16, label: "Anulado", align: "right", format: formatCurrency, sum: true },
  { key: 17, label: "Liquidado", align: "right", format: formatCurrency, sum: true },
  { key: 18, label: "Pago", align: "right", format: formatCurrency, sum: true },
  { key: 19, label: "Saldo", align: "right", format: formatCurrency, sum: true },
];

const COLS_LIQ: ColumnSpec<AnyRow>[] = [
  { key: 0, label: "Data Liq." },
  { key: 1, label: "Órgão" },
  { key: 2, label: "Credor" },
  { key: 3, label: "CPF/CNPJ" },
  { key: 4, label: "Nº Liquidação" },
  { key: 5, label: "Nº Empenho" },
  { key: 6, label: "Valor", align: "right", format: formatCurrency, sum: true },
  { key: 7, label: "Anulação", align: "right", format: formatCurrency, sum: true },
  { key: 8, label: "Líquido", align: "right", format: formatCurrency, sum: true },
  { key: 9, label: "Pago", align: "right", format: formatCurrency, sum: true },
  { key: 10, label: "Saldo", align: "right", format: formatCurrency, sum: true },
];

const COLS_PGTO: ColumnSpec<AnyRow>[] = [
  { key: 0, label: "Data Pgto." },
  { key: 1, label: "Órgão" },
  { key: 2, label: "Credor" },
  { key: 3, label: "CPF/CNPJ" },
  { key: 4, label: "Nº Pagamento" },
  { key: 12, label: "Nº Empenho" },
  { key: 7, label: "Valor", align: "right", format: formatCurrency, sum: true },
  { key: 8, label: "Anulação", align: "right", format: formatCurrency, sum: true },
  { key: 9, label: "Líquido", align: "right", format: formatCurrency, sum: true },
];

const COLS_REC: ColumnSpec<AnyRow>[] = [
  { key: 0, label: "Data" },
  { key: 1, label: "Órgão" },
  { key: 2, label: "Cód. Elemento" },
  { key: 3, label: "Desc. Elemento" },
  { key: 4, label: "Fonte" },
  { key: 5, label: "Destinação" },
  { key: 6, label: "Valor", align: "right", format: formatCurrency, sum: true },
  { key: 7, label: "Valor Final", align: "right", format: formatCurrency, sum: true },
  { key: 8, label: "Observação" },
  { key: 9, label: "Fornecedor" },
];

const COLS_CTR: ColumnSpec<AnyRow>[] = [
  { key: 0, label: "Data Liq." },
  { key: 1, label: "Credor" },
  { key: 2, label: "CPF/CNPJ" },
  { key: 3, label: "Processo" },
  { key: 4, label: "N. Contrato" },
  { key: 5, label: "Licitação" },
  { key: 6, label: "Nº Empenho" },
  { key: 7, label: "Parcela" },
  { key: 8, label: "Vl. Empenho", align: "right", format: formatCurrency, sum: true },
  { key: 9, label: "Vl. Liquidação", align: "right", format: formatCurrency, sum: true },
  { key: 10, label: "Vl. Pago", align: "right", format: formatCurrency, sum: true },
  { key: 12, label: "Vencimento" },
];

const COL_SPECS: Record<string, ColumnSpec<AnyRow>[]> = {
  "enriched.empenhos":    COLS_EMP,
  "enriched.liquidacoes": COLS_LIQ,
  "enriched.pagamentos":  COLS_PGTO,
  "enriched.receita":     COLS_REC,
  "enriched.contratos":   COLS_CTR,
};

const DATE_COL_IDX: Record<string, number> = {
  "enriched.empenhos":    0,
  "enriched.liquidacoes": 0,
  "enriched.pagamentos":  0,
  "enriched.receita":     0,
  "enriched.contratos":   0,
};

// ══════════════════════════════════════════════════════════════
//  TablePage
// ══════════════════════════════════════════════════════════════

interface TablePageProps {
  title: string;
  dataKey: keyof typeof COL_SPECS;
}

function selectRows(state: ReturnType<typeof useStore.getState>, dataKey: string): AnyRow[] {
  const enriched = state.data.enriched;
  switch (dataKey) {
    case "enriched.empenhos":    return enriched.empenhos as AnyRow[];
    case "enriched.liquidacoes": return enriched.liquidacoes as AnyRow[];
    case "enriched.pagamentos":  return enriched.pagamentos as AnyRow[];
    case "enriched.receita":     return enriched.receita as AnyRow[];
    case "enriched.contratos":   return enriched.contratos as AnyRow[];
    default:                     return [];
  }
}

export function TablePage({ title, dataKey }: TablePageProps) {
  const ctx = useOutletContext<AppShellCtx>();
  const rows = useStore((s) => selectRows(s, dataKey));
  const periodo = useStore((s) => s.filters.periodo);
  const [tab, setTab] = useState<string>("Todos");

  // Aplica filtro de período sobre a data da linha (col 0)
  const periodFiltered = useMemo(() => {
    if (periodo.mode === "todo" || (!periodo.ini && !periodo.fim)) return rows;
    const colIdx = DATE_COL_IDX[dataKey] ?? 0;
    const ini = periodo.ini ? periodo.ini.getTime() : -Infinity;
    const fim = periodo.fim ? periodo.fim.getTime() + 86399_000 : Infinity;
    return rows.filter((r) => {
      const d = parseDDMMYYYY(String(r[colIdx] ?? "").trim());
      if (!d) return false;
      const t = d.getTime();
      return t >= ini && t <= fim;
    });
  }, [rows, periodo, dataKey]);

  // Tabs de status — só faz sentido pra Empenhos (TIPO na col [22] enriquecida)
  // Pra outras rotas, expomos só "Todos".
  const TIPO_COL = dataKey === "enriched.empenhos" ? 22 : -1;
  const showStatusTabs = dataKey === "enriched.empenhos";

  const statusCounts = useMemo(() => {
    if (!showStatusTabs) return { Todos: periodFiltered.length };
    const c: Record<string, number> = { Todos: periodFiltered.length };
    for (const r of periodFiltered) {
      const t = String(r[TIPO_COL] ?? "").trim() || "Empenhado";
      c[t] = (c[t] ?? 0) + 1;
    }
    return c;
  }, [periodFiltered, showStatusTabs, TIPO_COL]);

  const finalRows = useMemo(() => {
    if (!showStatusTabs || tab === "Todos") return periodFiltered;
    return periodFiltered.filter((r) => String(r[TIPO_COL] ?? "").trim() === tab);
  }, [periodFiltered, tab, showStatusTabs, TIPO_COL]);

  // Total monetário (col valor varia por dataKey — usamos a primeira sum:true das columns)
  const total = useMemo(() => {
    const cols = COL_SPECS[dataKey];
    const valCol = cols.find((c) => c.sum);
    if (!valCol) return 0;
    const idx = typeof valCol.key === "number" ? valCol.key : -1;
    if (idx < 0) return 0;
    let s = 0;
    for (const r of finalRows) {
      const v = Number(r[idx]);
      if (Number.isFinite(v)) s += v;
    }
    return s;
  }, [finalRows, dataKey]);

  const columns = COL_SPECS[dataKey];

  return (
    <div className="screen" data-screen-label={title}>
      <TopBar breadcrumb={["Painel", title]} onMenuClick={ctx?.openMobileMenu} />

      <div className="page-head">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-desc">
            {periodFiltered.length.toLocaleString("pt-BR")} {title.toLowerCase()} no período
            {total > 0 && ` · valor total ${formatCurrency(total)}`}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost">
            <Download size={14} /> Exportar
          </button>
          {dataKey === "enriched.empenhos" && (
            <button className="btn btn-primary">
              <Plus size={14} /> Novo empenho
            </button>
          )}
        </div>
      </div>

      {showStatusTabs && (
        <div className="tabs">
          {["Todos", "NOTA DE EMPENHO", "RESTO A PAGAR"].map((s) => (
            <button
              key={s}
              className={`tab ${tab === s ? "is-active" : ""}`}
              onClick={() => setTab(s)}
            >
              {s === "NOTA DE EMPENHO" ? "Empenhado" : s === "RESTO A PAGAR" ? "Restos a Pagar" : s}
              <span className="tab-count mono">{(statusCounts[s] ?? 0).toLocaleString("pt-BR")}</span>
            </button>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="stub-empty">
          <span className="stub-icon">
            <Database size={28} strokeWidth={1.5} />
          </span>
          <h2 className="stub-title">Sem dados</h2>
          <p className="stub-desc">
            Busque um ano em Integrações para começar a visualizar os {title.toLowerCase()}.
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={finalRows}
          exportName={dataKey.replace("enriched.", "")}
          virtualize
          virtualHeight={650}
        />
      )}
    </div>
  );
}
