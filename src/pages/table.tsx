import { useMemo } from "react";
import { Database } from "lucide-react";
import { DataTable, type ColumnSpec } from "@/components/data-table";
import { formatCurrency } from "@/lib/config";
import { parseDDMMYYYY } from "@/lib/compute";
import { useStore } from "@/store";

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
//  TablePage — usa dataKey para resolver rows + columns
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
  const rows = useStore((s) => selectRows(s, dataKey));
  const periodo = useStore((s) => s.filters.periodo);

  // Aplica filtro de período sobre a data da linha (col 0)
  const filteredRows = useMemo(() => {
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

  const columns = COL_SPECS[dataKey];

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Database className="mx-auto size-10 text-muted-foreground" />
          <h2 className="mt-3 text-base font-medium">Sem dados</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Busque um ano em Integrações para começar.
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={filteredRows}
          exportName={dataKey.replace("enriched.", "")}
          virtualize
          virtualHeight={650}
        />
      )}
    </div>
  );
}

