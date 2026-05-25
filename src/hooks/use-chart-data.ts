import { useMemo } from "react";
import type { ChartData, ChartOptions } from "chart.js";
import type { DiarioResult, MensalResult } from "@/lib/compute";
import { formatCurrency, formatShort, MESES } from "@/lib/config";
import { useTheme } from "@/components/theme-provider";

export type ChartTipo = "barras" | "linha";
export type ChartModeIn = "diario" | "mensal";

const CHART_COLORS = {
  empenhado: "#2563eb", // blue-600
  liquidado: "#10b981", // emerald-500
  pago:      "#14b8a6", // teal-500
} as const;

interface ThemeColors {
  foreground: string;
  border: string;
  popover: string;
  popoverForeground: string;
  fontFamily: string;
}

/** Lê tokens resolvidos do <html> — Chart.js renderiza no canvas e não interpreta `var(--*)`. */
function readThemeColors(): ThemeColors {
  if (typeof window === "undefined") {
    return {
      foreground: "#000",
      border: "#e5e7eb",
      popover: "#fff",
      popoverForeground: "#000",
      fontFamily: "Geist, Inter, sans-serif",
    };
  }
  const cs = getComputedStyle(document.documentElement);
  return {
    foreground:        cs.getPropertyValue("--foreground").trim()         || "#000",
    border:            cs.getPropertyValue("--border").trim()             || "#e5e7eb",
    popover:           cs.getPropertyValue("--popover").trim()            || "#fff",
    popoverForeground: cs.getPropertyValue("--popover-foreground").trim() || "#000",
    fontFamily:        cs.getPropertyValue("--font-sans").trim()          || "Geist, Inter, sans-serif",
  };
}

function buildChartOptions(c: ThemeColors): ChartOptions<"bar" | "line"> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: c.foreground,
          font: { family: c.fontFamily },
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: c.popover,
        titleColor: c.popoverForeground,
        bodyColor: c.popoverForeground,
        borderColor: c.border,
        borderWidth: 1,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(Number(ctx.parsed.y))}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: c.foreground, font: { family: c.fontFamily } },
        grid: { color: c.border },
      },
      y: {
        ticks: {
          color: c.foreground,
          font: { family: c.fontFamily },
          callback: (val) => formatShort(Number(val)),
        },
        grid: { color: c.border },
      },
    },
  };
}

/**
 * Constrói chart data + options para Bar/Line do Painel.
 * - tipo "barras" lê valores simples (empenhado/liquidado/pago do período).
 * - tipo "linha"  lê valores acumulados (empAcum/liqAcum/pagoAcum).
 * - mode "diario" usa séries por dia; "mensal" usa séries por mês com label de MESES.
 */
export function useChartData(
  tipo: ChartTipo,
  mode: ChartModeIn,
  diario: DiarioResult | null,
  mensal: MensalResult | null,
): { data: ChartData<"bar" | "line">; options: ChartOptions<"bar" | "line"> } {
  const { resolvedTheme } = useTheme();
  return useMemo(() => {
    const options = buildChartOptions(readThemeColors());

    if (tipo === "barras") {
      if (mode === "mensal") {
        const series = mensal?.simples ?? [];
        const labels = series.map((m) => MESES[m.mes - 1] ?? `Mês ${m.mes}`);
        return {
          data: {
            labels,
            datasets: [
              { label: "Empenhado", data: series.map((m) => m.empenhado), backgroundColor: CHART_COLORS.empenhado },
              { label: "Liquidado", data: series.map((m) => m.liquidado), backgroundColor: CHART_COLORS.liquidado },
              { label: "Pago",      data: series.map((m) => m.pago),      backgroundColor: CHART_COLORS.pago      },
            ],
          },
          options,
        };
      }
      const series = diario?.simples ?? [];
      const labels = series.map((d) => d.data);
      return {
        data: {
          labels,
          datasets: [
            { label: "Empenhado", data: series.map((d) => d.empenhado), backgroundColor: CHART_COLORS.empenhado },
            { label: "Liquidado", data: series.map((d) => d.liquidado), backgroundColor: CHART_COLORS.liquidado },
            { label: "Pago",      data: series.map((d) => d.pago),      backgroundColor: CHART_COLORS.pago      },
          ],
        },
        options,
      };
    }

    // tipo === "linha" → acumulado
    if (mode === "mensal") {
      const series = mensal?.acumulado ?? [];
      const labels = series.map((m) => MESES[m.mes - 1] ?? `Mês ${m.mes}`);
      return {
        data: {
          labels,
          datasets: [
            {
              label: "Empenhado",
              data: series.map((m) => m.empAcum),
              borderColor: CHART_COLORS.empenhado,
              backgroundColor: CHART_COLORS.empenhado + "33",
              tension: 0.3,
              fill: false,
            },
            {
              label: "Liquidado",
              data: series.map((m) => m.liqAcum),
              borderColor: CHART_COLORS.liquidado,
              backgroundColor: CHART_COLORS.liquidado + "33",
              tension: 0.3,
              fill: false,
            },
            {
              label: "Pago",
              data: series.map((m) => m.pagoAcum),
              borderColor: CHART_COLORS.pago,
              backgroundColor: CHART_COLORS.pago + "33",
              tension: 0.3,
              fill: false,
            },
          ],
        },
        options,
      };
    }
    const series = diario?.acumulado ?? [];
    const labels = series.map((d) => d.data);
    return {
      data: {
        labels,
        datasets: [
          {
            label: "Empenhado",
            data: series.map((d) => d.empAcum),
            borderColor: CHART_COLORS.empenhado,
            backgroundColor: CHART_COLORS.empenhado + "33",
            tension: 0.3,
            fill: false,
          },
          {
            label: "Liquidado",
            data: series.map((d) => d.liqAcum),
            borderColor: CHART_COLORS.liquidado,
            backgroundColor: CHART_COLORS.liquidado + "33",
            tension: 0.3,
            fill: false,
          },
          {
            label: "Pago",
            data: series.map((d) => d.pagoAcum),
            borderColor: CHART_COLORS.pago,
            backgroundColor: CHART_COLORS.pago + "33",
            tension: 0.3,
            fill: false,
          },
        ],
      },
      options,
    };
    // resolvedTheme intencionalmente nas deps — re-resolve cores DOM ao trocar light/dark.
    // O linter não enxerga a dep porque readThemeColors() lê do getComputedStyle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, mode, diario, mensal, resolvedTheme]);
}
