import { useMemo, useState } from "react";
import {
  Wallet,
  CheckCircle2,
  Banknote,
  Scale,
  ArrowDownCircle,
  Receipt,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { KpiCard } from "@/components/kpi-card";
import { FilterBar } from "@/components/filter-bar";
import { ChartBlock } from "@/components/chart-block";
import { DetailDrawer } from "@/components/detail-drawer";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DataTable, type ColumnSpec } from "@/components/data-table";
import { formatCurrency, formatPercent, MESES, formatShort } from "@/lib/config";
import { usePainelData } from "@/hooks/use-painel-data";
import { useStore } from "@/store";
import type { ChartMode, DemonstrativoTipo } from "@/store";
import type {
  ContratoSummary,
  EmpRow,
  GroupedRow,
  LiqRow,
  MensalPercentual,
} from "@/lib/compute";
import { CE, CL, parseDDMMYYYY } from "@/lib/compute";

// Registra elements/scales Chart.js uma única vez
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

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
//  Chart.js — config compartilhada
// ══════════════════════════════════════════════════════════════

const CHART_COLORS = {
  empenhado: "#2563eb", // blue-600
  liquidado: "#10b981", // emerald-500
  pago:      "#14b8a6", // teal-500
};

function buildChartOptions(): ChartOptions<"bar" | "line"> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "var(--foreground)",
          font: { family: "var(--font-sans)" },
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: "var(--popover)",
        titleColor: "var(--popover-foreground)",
        bodyColor: "var(--popover-foreground)",
        borderColor: "var(--border)",
        borderWidth: 1,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(Number(ctx.parsed.y))}`,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: "var(--foreground)",
          font: { family: "var(--font-sans)" },
        },
        grid: { color: "var(--border)" },
      },
      y: {
        ticks: {
          color: "var(--foreground)",
          font: { family: "var(--font-sans)" },
          callback: (val) => formatShort(Number(val)),
        },
        grid: { color: "var(--border)" },
      },
    },
  };
}

// ══════════════════════════════════════════════════════════════
//  Painel
// ══════════════════════════════════════════════════════════════

interface DrawerState {
  open: boolean;
  title: string;
  sub: string;
  empRows: EmpRow[];
  liqRows: LiqRow[];
}

export function PainelPage() {
  const data = usePainelData();
  const demonstrativo = useStore((s) => s.filters.demonstrativo);
  const setDemonstrativo = useStore((s) => s.setDemonstrativo);
  const importing = useStore((s) => s.ui.importing);
  const barrasMode = useStore((s) => s.charts.barras.mode);
  const linhaMode = useStore((s) => s.charts.linha.mode);
  const setChartMode = useStore((s) => s.setChartMode);

  const [drawer, setDrawer] = useState<DrawerState | null>(null);

  const hasData = data.empRows.length > 0 || importing;

  // ── Drawer helper: abre com título, subtítulo e filtros aplicados ──
  const openDrawer = (
    title: string,
    sub: string,
    empFilter?: (r: EmpRow) => boolean,
    liqFilter?: (r: LiqRow) => boolean,
  ): void => {
    const empRows = empFilter ? data.empRows.filter(empFilter) : data.empRows;
    const liqRows = liqFilter ? data.liqRows.filter(liqFilter) : data.liqRows;
    setDrawer({ open: true, title, sub, empRows, liqRows });
  };

  // Resolve dataset do Demonstrativo
  type PadraoDim = Exclude<DemonstrativoTipo, "contrato" | "mensal">;
  const demoDataset:
    | { type: "padrao"; rows: GroupedRow[]; label: string; dim: PadraoDim }
    | { type: "mensal"; rows: MensalRow[] }
    | { type: "contrato"; rows: ContratoSummary[] } = (() => {
    switch (demonstrativo) {
      case "orgao":    return { type: "padrao", rows: data.orgaos,    label: DEMO_LABELS.orgao,    dim: "orgao" };
      case "unidade":  return { type: "padrao", rows: data.unidades,  label: DEMO_LABELS.unidade,  dim: "unidade" };
      case "acao":     return { type: "padrao", rows: data.acoes,     label: DEMO_LABELS.acao,     dim: "acao" };
      case "elemento": return { type: "padrao", rows: data.elementos, label: DEMO_LABELS.elemento, dim: "elemento" };
      case "programa": return { type: "padrao", rows: data.programas, label: DEMO_LABELS.programa, dim: "programa" };
      case "fonte":    return { type: "padrao", rows: data.fontes,    label: DEMO_LABELS.fonte,    dim: "fonte" };
      case "credor":   return { type: "padrao", rows: data.credores,  label: DEMO_LABELS.credor,   dim: "credor" };
      case "numlicit": return { type: "padrao", rows: data.numlicits, label: DEMO_LABELS.numlicit, dim: "numlicit" };
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

  // ── Click handlers do Demonstrativo (cada dim filtra de forma diferente) ──
  const onPadraoRowClick = (
    dim: Exclude<DemonstrativoTipo, "contrato" | "mensal">,
    row: GroupedRow,
  ): void => {
    const label = String(row[dim] ?? "");
    if (!label) return;
    const title = `${DEMO_LABELS[dim]} — ${label}`;
    const sub = `Detalhes filtrados por ${DEMO_LABELS[dim].toLowerCase()}.`;

    // Mapeia dim → função de filtro nos rows brutos
    switch (dim) {
      case "orgao":
        openDrawer(title, sub,
          (r) => String(r[CE.ORGAO] ?? "") === label,
          (r) => String(r[CL.ORGAO] ?? "") === label,
        );
        break;
      case "unidade":
        openDrawer(title, sub,
          (r) => String(r[CE.UNIDADE] ?? "") === label,
          (r) => {
            const num = String(r[CL.NUM_EMP] ?? "");
            return data.empRows.some(
              (e) => String(e[CE.NUM_EMP] ?? "") === num && String(e[CE.UNIDADE] ?? "") === label,
            );
          },
        );
        break;
      case "acao":
        openDrawer(title, sub,
          (r) => String(r[CE.ACAO] ?? "") === label,
          (r) => {
            const num = String(r[CL.NUM_EMP] ?? "");
            return data.empRows.some(
              (e) => String(e[CE.NUM_EMP] ?? "") === num && String(e[CE.ACAO] ?? "") === label,
            );
          },
        );
        break;
      case "elemento":
        openDrawer(title, sub,
          (r) => String(r[CE.ELEMENTO] ?? "") === label,
          (r) => {
            const num = String(r[CL.NUM_EMP] ?? "");
            return data.empRows.some(
              (e) => String(e[CE.NUM_EMP] ?? "") === num && String(e[CE.ELEMENTO] ?? "") === label,
            );
          },
        );
        break;
      case "programa":
        openDrawer(title, sub,
          (r) => String(r[CE.PROGRAMA] ?? "") === label,
          (r) => {
            const num = String(r[CL.NUM_EMP] ?? "");
            return data.empRows.some(
              (e) => String(e[CE.NUM_EMP] ?? "") === num && String(e[CE.PROGRAMA] ?? "") === label,
            );
          },
        );
        break;
      case "fonte":
        openDrawer(title, sub,
          (r) => String(r[CE.FONTE] ?? "") === label,
          (r) => {
            const num = String(r[CL.NUM_EMP] ?? "");
            return data.empRows.some(
              (e) => String(e[CE.NUM_EMP] ?? "") === num && String(e[CE.FONTE] ?? "") === label,
            );
          },
        );
        break;
      case "credor": {
        // Credor: filtra liqRows por CL.CREDOR, depois empRows por NUM_EMP correspondente
        const liqFilter = (r: LiqRow) => String(r[CL.CREDOR] ?? "") === label;
        const liqMatching = data.liqRows.filter(liqFilter);
        const empNums = new Set(liqMatching.map((r) => String(r[CL.NUM_EMP] ?? "")).filter(Boolean));
        openDrawer(title, sub,
          (r) => empNums.has(String(r[CE.NUM_EMP] ?? "")),
          liqFilter,
        );
        break;
      }
      case "numlicit":
        openDrawer(title, sub,
          (r) => String(r[CE.ID_LICIT] ?? "") === label,
          (r) => {
            const num = String(r[CL.NUM_EMP] ?? "");
            return data.empRows.some(
              (e) => String(e[CE.NUM_EMP] ?? "") === num && String(e[CE.ID_LICIT] ?? "") === label,
            );
          },
        );
        break;
    }
  };

  const onMensalRowClick = (row: MensalRow): void => {
    const m = row.mes;
    const label = MESES[(m ?? 1) - 1] ?? `Mês ${m}`;
    const filterByMonth = (dateStr: unknown): boolean => {
      const d = parseDDMMYYYY(dateStr);
      return d !== null && d.getMonth() + 1 === m;
    };
    openDrawer(
      `Mês — ${label}`,
      `Empenhos e liquidações do mês ${label}.`,
      (r) => filterByMonth(r[CE.DATA]),
      (r) => filterByMonth(r[CL.DATA_LIQ]),
    );
  };

  const onContratoRowClick = (row: ContratoSummary): void => {
    const contrato = row.contrato;
    // Não temos índice direto no painel hook — para simplicidade, mostramos todos
    // (parent já filtrou via filterByContrato se filter ativo). V8.5 melhora.
    openDrawer(
      `Contrato — ${contrato}`,
      `Empenhos e liquidações vinculados ao contrato ${contrato}.`,
    );
  };

  // ══════════════════════════════════════════════════════════════
  //  Chart data — barras e linha
  // ══════════════════════════════════════════════════════════════

  const chartOptions = useMemo(() => buildChartOptions(), []);

  const barrasData = useMemo(() => {
    if (barrasMode === "mensal") {
      const labels = data.mensal.simples.map((m) => MESES[m.mes - 1] ?? `Mês ${m.mes}`);
      return {
        labels,
        datasets: [
          {
            label: "Empenhado",
            data: data.mensal.simples.map((m) => m.empenhado),
            backgroundColor: CHART_COLORS.empenhado,
          },
          {
            label: "Liquidado",
            data: data.mensal.simples.map((m) => m.liquidado),
            backgroundColor: CHART_COLORS.liquidado,
          },
          {
            label: "Pago",
            data: data.mensal.simples.map((m) => m.pago),
            backgroundColor: CHART_COLORS.pago,
          },
        ],
      };
    }
    const labels = data.diario.simples.map((d) => d.data);
    return {
      labels,
      datasets: [
        {
          label: "Empenhado",
          data: data.diario.simples.map((d) => d.empenhado),
          backgroundColor: CHART_COLORS.empenhado,
        },
        {
          label: "Liquidado",
          data: data.diario.simples.map((d) => d.liquidado),
          backgroundColor: CHART_COLORS.liquidado,
        },
        {
          label: "Pago",
          data: data.diario.simples.map((d) => d.pago),
          backgroundColor: CHART_COLORS.pago,
        },
      ],
    };
  }, [barrasMode, data.mensal.simples, data.diario.simples]);

  const linhaData = useMemo(() => {
    if (linhaMode === "mensal") {
      const labels = data.mensal.acumulado.map((m) => MESES[m.mes - 1] ?? `Mês ${m.mes}`);
      return {
        labels,
        datasets: [
          {
            label: "Empenhado",
            data: data.mensal.acumulado.map((m) => m.empAcum),
            borderColor: CHART_COLORS.empenhado,
            backgroundColor: CHART_COLORS.empenhado + "33",
            tension: 0.3,
            fill: false,
          },
          {
            label: "Liquidado",
            data: data.mensal.acumulado.map((m) => m.liqAcum),
            borderColor: CHART_COLORS.liquidado,
            backgroundColor: CHART_COLORS.liquidado + "33",
            tension: 0.3,
            fill: false,
          },
          {
            label: "Pago",
            data: data.mensal.acumulado.map((m) => m.pagoAcum),
            borderColor: CHART_COLORS.pago,
            backgroundColor: CHART_COLORS.pago + "33",
            tension: 0.3,
            fill: false,
          },
        ],
      };
    }
    const labels = data.diario.acumulado.map((d) => d.data);
    return {
      labels,
      datasets: [
        {
          label: "Empenhado",
          data: data.diario.acumulado.map((d) => d.empAcum),
          borderColor: CHART_COLORS.empenhado,
          backgroundColor: CHART_COLORS.empenhado + "33",
          tension: 0.3,
          fill: false,
        },
        {
          label: "Liquidado",
          data: data.diario.acumulado.map((d) => d.liqAcum),
          borderColor: CHART_COLORS.liquidado,
          backgroundColor: CHART_COLORS.liquidado + "33",
          tension: 0.3,
          fill: false,
        },
        {
          label: "Pago",
          data: data.diario.acumulado.map((d) => d.pagoAcum),
          borderColor: CHART_COLORS.pago,
          backgroundColor: CHART_COLORS.pago + "33",
          tension: 0.3,
          fill: false,
        },
      ],
    };
  }, [linhaMode, data.mensal.acumulado, data.diario.acumulado]);

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
          onClick={() => openDrawer(
            "Empenhado",
            "Total empenhado no período filtrado.",
          )}
        />
        <KpiCard
          label="Liquidado"
          value={data.kpis.liquidado}
          icon={CheckCircle2}
          accent="emerald"
          loading={importing && !hasData}
          onClick={() => {
            // Empenhos cujo NUM_EMP existe em liqRows tipo NOTA DE EMPENHO
            const liqFilter = (r: LiqRow) => {
              const tipo = String(r[CL.TIPO] ?? "").trim();
              return tipo === "" || tipo === "NOTA DE EMPENHO";
            };
            const liqMatch = data.liqRows.filter(liqFilter);
            const empNums = new Set(liqMatch.map((r) => String(r[CL.NUM_EMP] ?? "")).filter(Boolean));
            openDrawer(
              "Liquidado",
              "Liquidações tipo NOTA DE EMPENHO + empenhos correspondentes.",
              (r) => empNums.has(String(r[CE.NUM_EMP] ?? "")),
              liqFilter,
            );
          }}
        />
        <KpiCard
          label="Pago"
          value={data.kpis.pago}
          icon={Banknote}
          accent="teal"
          loading={importing && !hasData}
          onClick={() => {
            const liqFilter = (r: LiqRow) => Number(r[CL.VL_PAGO] ?? 0) > 0;
            const liqMatch = data.liqRows.filter(liqFilter);
            const empNums = new Set(liqMatch.map((r) => String(r[CL.NUM_EMP] ?? "")).filter(Boolean));
            openDrawer(
              "Pago",
              "Empenhos com valor pago > 0.",
              (r) => empNums.has(String(r[CE.NUM_EMP] ?? "")),
              liqFilter,
            );
          }}
        />
        <KpiCard
          label="Saldo a pagar"
          value={data.kpis.empenhado - data.kpis.anulado - data.kpis.pago}
          icon={Scale}
          accent="rose"
          loading={importing && !hasData}
          onClick={() => openDrawer(
            "Saldo a pagar",
            "Empenhos com saldo pendente (Empenhado − Anulado − Pago).",
            (r) => Number(r[CE.SALDO] ?? 0) > 0,
          )}
        />
        <KpiCard
          label="Anulado"
          value={data.kpis.anulado}
          icon={ArrowDownCircle}
          accent="amber"
          loading={importing && !hasData}
          onClick={() => {
            const liqFilter = (r: LiqRow) => Number(r[CL.VL_ANUL] ?? 0) > 0;
            const liqMatch = data.liqRows.filter(liqFilter);
            const empNums = new Set(liqMatch.map((r) => String(r[CL.NUM_EMP] ?? "")).filter(Boolean));
            openDrawer(
              "Anulado",
              "Liquidações com anulação > 0.",
              (r) => empNums.has(String(r[CE.NUM_EMP] ?? "")),
              liqFilter,
            );
          }}
        />
        <KpiCard
          label="Retido"
          value={data.kpis.retido}
          icon={Receipt}
          accent="violet"
          loading={importing && !hasData}
          onClick={() => openDrawer(
            "Retido",
            "Retenções aplicadas no período.",
          )}
        />
      </div>

      {/* Charts — Bar (períodos) + Line (acumulado) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartBlock
          title="Evolução por período"
          sub="Comparação Empenhado · Liquidado · Pago."
          mode={barrasMode}
          onModeChange={(m) => setChartMode("barras", m)}
        >
          <Bar data={barrasData} options={chartOptions as ChartOptions<"bar">} />
        </ChartBlock>

        <ChartBlock
          title="Evolução acumulada"
          sub="Soma corrente Empenhado · Liquidado · Pago."
          mode={linhaMode}
          onModeChange={(m) => setChartMode("linha", m)}
        >
          <Line data={linhaData} options={chartOptions as ChartOptions<"line">} />
        </ChartBlock>
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
            Agregado por dimensão — clique numa linha para ver detalhes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {demoDataset.type === "mensal" ? (
            <DataTable
              columns={COLS_MENSAL}
              rows={demoDataset.rows}
              exportName="mensal"
              onRowClick={onMensalRowClick}
            />
          ) : demoDataset.type === "contrato" ? (
            <DataTable
              columns={COLS_CONTRATO}
              rows={demoDataset.rows}
              exportName="contrato"
              onRowClick={onContratoRowClick}
            />
          ) : (
            <DataTable
              columns={COLS_PADRAO(demoDataset.label)}
              rows={demoDataset.rows}
              exportName={demonstrativo}
              onRowClick={(row) => onPadraoRowClick(demoDataset.dim, row)}
            />
          )}
        </CardContent>
      </Card>

      {/* Detail drawer */}
      <DetailDrawer
        open={drawer?.open ?? false}
        title={drawer?.title ?? ""}
        sub={drawer?.sub}
        empRows={drawer?.empRows ?? []}
        liqRows={drawer?.liqRows ?? []}
        onClose={() => setDrawer(null)}
      />
    </div>
  );
}

// Suppress unused import warning — used inferentially via ChartMode prop on ChartBlock
void {} as unknown as ChartMode;
