import {
  Wallet,
  CheckCircle2,
  Banknote,
  Scale,
  ArrowDownCircle,
  Receipt,
} from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { FilterBar } from "@/components/filter-bar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataTable, type ColumnSpec } from "@/components/data-table";
import { formatCurrency, formatPercent, MESES } from "@/lib/config";
import { usePainelData } from "@/hooks/use-painel-data";
import { useStore } from "@/store";
import type { DemonstrativoTipo } from "@/store";
import type { GroupedRow, ContratoSummary, MensalPercentual } from "@/lib/compute";

// ══════════════════════════════════════════════════════════════
//  Configs para o Demonstrativo unificado
// ══════════════════════════════════════════════════════════════

const DEMO_LABELS: Record<DemonstrativoTipo, string> = {
  orgao:    "Órgão",
  unidade:  "Unidade Orçamentária",
  acao:     "Ação",
  elemento: "Elemento",
  programa: "Programa",
  fonte:    "Fonte de Recurso",
  credor:   "Credor",
  numlicit: "N. Licitação",
  contrato: "N. Contrato",
  mensal:   "Mês",
};

const COLS_PADRAO = (firstLabel: string): ColumnSpec<GroupedRow>[] => [
  { key: "label", label: firstLabel },
  { key: "empenhado", label: "Empenhado", align: "right", format: formatCurrency, sum: true },
  { key: "liquidado", label: "Liquidado", align: "right", format: formatCurrency, sum: true },
  { key: "anulado",   label: "Anulado",   align: "right", format: formatCurrency, sum: true },
  { key: "retido",    label: "Retido",    align: "right", format: formatCurrency, sum: true },
  { key: "pago",      label: "Pago",      align: "right", format: formatCurrency, sum: true },
];

type MensalRow = MensalPercentual & { mesLabel: string };

const COLS_MENSAL: ColumnSpec<MensalRow>[] = [
  { key: "mesLabel", label: "Mês" },
  { key: "empenhado", label: "Empenhado", align: "right", format: formatCurrency, sum: true },
  { key: "liquidado", label: "Liquidado", align: "right", format: formatCurrency, sum: true },
  { key: "anulado",   label: "Anulado",   align: "right", format: formatCurrency, sum: true },
  { key: "retido",    label: "Retido",    align: "right", format: formatCurrency, sum: true },
  { key: "pago",      label: "Pago",      align: "right", format: formatCurrency, sum: true },
  { key: "pctEmpenhado", label: "% Emp. Acum.", align: "right", format: formatPercent },
  { key: "pctPago",      label: "% Pago Acum.", align: "right", format: formatPercent },
];

const COLS_CONTRATO: ColumnSpec<ContratoSummary>[] = [
  { key: "contrato",  label: "N. Contrato" },
  { key: "empenhado", label: "Empenhado", align: "right", format: formatCurrency, sum: true },
  { key: "liquidado", label: "Liquidado", align: "right", format: formatCurrency, sum: true },
  { key: "anulado",   label: "Anulado",   align: "right", format: formatCurrency, sum: true },
  { key: "retido",    label: "Retido",    align: "right", format: formatCurrency, sum: true },
  { key: "pago",      label: "Pago",      align: "right", format: formatCurrency, sum: true },
];

// ══════════════════════════════════════════════════════════════
//  Painel
// ══════════════════════════════════════════════════════════════

export function PainelPage() {
  const data = usePainelData();
  const demonstrativo = useStore((s) => s.filters.demonstrativo);
  const setDemonstrativo = useStore((s) => s.setDemonstrativo);
  const importing = useStore((s) => s.ui.importing);

  const hasData = data.empRows.length > 0 || importing;

  // Resolve dataset do Demonstrativo
  const demoDataset:
    | { type: "padrao"; rows: GroupedRow[]; label: string }
    | { type: "mensal"; rows: MensalRow[] }
    | { type: "contrato"; rows: ContratoSummary[] } = (() => {
    switch (demonstrativo) {
      case "orgao":    return { type: "padrao", rows: data.orgaos,    label: DEMO_LABELS.orgao };
      case "unidade":  return { type: "padrao", rows: data.unidades,  label: DEMO_LABELS.unidade };
      case "acao":     return { type: "padrao", rows: data.acoes,     label: DEMO_LABELS.acao };
      case "elemento": return { type: "padrao", rows: data.elementos, label: DEMO_LABELS.elemento };
      case "programa": return { type: "padrao", rows: data.programas, label: DEMO_LABELS.programa };
      case "fonte":    return { type: "padrao", rows: data.fontes,    label: DEMO_LABELS.fonte };
      case "credor":   return { type: "padrao", rows: data.credores,  label: DEMO_LABELS.credor };
      case "numlicit": return { type: "padrao", rows: data.numlicits, label: DEMO_LABELS.numlicit };
      case "contrato": return { type: "contrato", rows: data.contratos };
      case "mensal":   return {
        type: "mensal",
        rows: data.mensal.percentual.map((m): MensalRow => ({
          ...m,
          mesLabel: MESES[(m.mes ?? 1) - 1] ?? `Mês ${m.mes}`,
        })),
      };
    }
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Painel</h1>
        {data.empRows.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {data.empRows.length.toLocaleString("pt-BR")} empenhos
          </span>
        )}
      </div>

      <FilterBar />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Empenhado"
          value={data.kpis.empenhado}
          icon={Wallet}
          accent="blue"
          loading={importing && !hasData}
        />
        <KpiCard
          label="Liquidado"
          value={data.kpis.liquidado}
          icon={CheckCircle2}
          accent="emerald"
          loading={importing && !hasData}
        />
        <KpiCard
          label="Pago"
          value={data.kpis.pago}
          icon={Banknote}
          accent="teal"
          loading={importing && !hasData}
        />
        <KpiCard
          label="Saldo a pagar"
          value={data.kpis.empenhado - data.kpis.anulado - data.kpis.pago}
          icon={Scale}
          accent="rose"
          loading={importing && !hasData}
        />
        <KpiCard
          label="Anulado"
          value={data.kpis.anulado}
          icon={ArrowDownCircle}
          accent="amber"
          loading={importing && !hasData}
        />
        <KpiCard
          label="Retido"
          value={data.kpis.retido}
          icon={Receipt}
          accent="violet"
          loading={importing && !hasData}
        />
      </div>

      {/* Demonstrativo unificado */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span>Demonstrativo por</span>
            <select
              value={demonstrativo}
              onChange={(e) => setDemonstrativo(e.target.value as DemonstrativoTipo)}
              className="h-8 rounded-md border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {Object.entries(DEMO_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </CardTitle>
          <CardDescription>
            Agregado por dimensão — clique numa linha para ver detalhes (V8.4 pendente).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {demoDataset.type === "mensal" ? (
            <DataTable columns={COLS_MENSAL} rows={demoDataset.rows} exportName="mensal" />
          ) : demoDataset.type === "contrato" ? (
            <DataTable columns={COLS_CONTRATO} rows={demoDataset.rows} exportName="contrato" />
          ) : (
            <DataTable
              columns={COLS_PADRAO(demoDataset.label)}
              rows={demoDataset.rows}
              exportName={demonstrativo}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
