// CombinedChart — gráfico SVG-based custom replicando o design.
// Substitui Chart.js + react-chartjs-2. Permite tabs (diário/acumulado),
// escala (dia/semana/mês), toggle por série na legend, hover tooltip.
//
// Vantagens vs Chart.js:
//  - Pixel-perfect com o design
//  - Sem bundle de 240KB do chart.js
//  - SVG nativo (acessível, escalável)
//  - Custom hover/tooltip integrado ao design

import { useId, useMemo, useRef, useState, useEffect } from "react";
import { LayoutDashboard, Zap, ChevronDown, ZoomIn, ZoomOut } from "lucide-react";
import { useStore } from "@/store";
import { formatCurrency, getMonthName } from "@/lib/config";
import { parseDDMMYYYY } from "@/lib/compute";
import type { ChartMode } from "@/store";

export interface ChartPoint {
  /** Data (objeto Date pra ordenação + formatação). */
  date: Date;
  empenhado: number;
  liquidado: number;
  pago: number;
  /** Acumulados pré-computados pra modo "acumulado". */
  cumEmpenhado: number;
  cumLiquidado: number;
  cumPago: number;
}

type Tab = "diario" | "acumulado";
type Scale = "dia" | "semana" | "mes";

interface CombinedChartProps {
  /** Pontos diários ordenados crescente. Componente faz agg pra semana/mês internamente. */
  data: ChartPoint[];
  /** Modo inicial. Default "acumulado". */
  initialTab?: Tab;
  /** Loading state. */
  loading?: boolean;
}

const COLOR_OF: Record<string, string> = {
  empenhado: "blue",
  liquidado: "green",
  pago: "rose",
};

const PAD = { l: 56, r: 24, t: 24, b: 36 } as const;
const VIEW_W = 1080;
const VIEW_H = 360;

export function CombinedChart({ data, initialTab = "acumulado", loading }: CombinedChartProps) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [scale, setScale] = useState<Scale>("dia");
  const [active, setActive] = useState({ empenhado: true, liquidado: true, pago: true });
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const setChartMode = useStore((s) => s.setChartMode);

  // Sync de tab com store (chart mode existente) — mantém compat
  useEffect(() => {
    const mode: ChartMode = tab === "diario" ? "diario" : "mensal";
    setChartMode("barras", mode);
    setChartMode("linha", mode);
  }, [tab, setChartMode]);

  // Agregação por scale
  const agg = useMemo<ChartPoint[]>(() => {
    if (!data.length) return [];
    if (scale === "dia") return data;
    if (scale === "semana") {
      const buckets = new Map<number, ChartPoint>();
      for (const d of data) {
        const k = Math.floor((d.date.getTime() - new Date(d.date.getFullYear(), 0, 1).getTime()) / (7 * 86_400_000));
        const existing = buckets.get(k);
        if (existing) {
          existing.empenhado += d.empenhado;
          existing.liquidado += d.liquidado;
          existing.pago += d.pago;
          existing.cumEmpenhado = d.cumEmpenhado;
          existing.cumLiquidado = d.cumLiquidado;
          existing.cumPago = d.cumPago;
          existing.date = d.date;
        } else {
          buckets.set(k, { ...d });
        }
      }
      return [...buckets.values()];
    }
    // mes
    const buckets = new Map<number, ChartPoint>();
    for (const d of data) {
      const k = d.date.getMonth();
      const existing = buckets.get(k);
      if (existing) {
        existing.empenhado += d.empenhado;
        existing.liquidado += d.liquidado;
        existing.pago += d.pago;
        existing.cumEmpenhado = d.cumEmpenhado;
        existing.cumLiquidado = d.cumLiquidado;
        existing.cumPago = d.cumPago;
        existing.date = d.date;
      } else {
        buckets.set(k, { ...d });
      }
    }
    return [...buckets.values()];
  }, [data, scale]);

  const series = (["empenhado", "liquidado", "pago"] as const).filter((s) => active[s]);
  const valKey = (s: "empenhado" | "liquidado" | "pago"): keyof ChartPoint =>
    tab === "acumulado"
      ? (`cum${s.charAt(0).toUpperCase()}${s.slice(1)}` as keyof ChartPoint)
      : s;

  const allValues = series.flatMap((s) => agg.map((d) => d[valKey(s)] as number));
  const maxV = Math.max(...allValues, 1);
  const niceMax = useMemo(() => {
    const pow = Math.pow(10, Math.floor(Math.log10(maxV)));
    const r = maxV / pow;
    const m = r > 5 ? 10 : r > 2 ? 5 : r > 1 ? 2 : 1;
    return m * pow;
  }, [maxV]);

  const x = (i: number) =>
    PAD.l + (i / Math.max(agg.length - 1, 1)) * (VIEW_W - PAD.l - PAD.r);
  const y = (v: number) =>
    PAD.t + (1 - v / niceMax) * (VIEW_H - PAD.t - PAD.b);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((p) => p * niceMax);

  const fmtTickY = (v: number): string => {
    if (v === 0) return "0";
    if (v >= 1e9) return (v / 1e9).toFixed(1).replace(".", ",") + " bi";
    if (v >= 1e6) return Math.round(v / 1e6) + " mi";
    if (v >= 1e3) return Math.round(v / 1e3) + " mil";
    return String(Math.round(v));
  };

  const fmtDate = (d: Date): string =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

  const onMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const scaleX = VIEW_W / rect.width;
    const px = (e.clientX - rect.left) * scaleX;
    const idx = Math.round(((px - PAD.l) / (VIEW_W - PAD.l - PAD.r)) * (agg.length - 1));
    if (idx >= 0 && idx < agg.length) setHover(idx);
    else setHover(null);
  };

  const gradId = useId().replace(/:/g, "");

  return (
    <div className="chart-block">
      <div className="chart-tabs">
        <button
          className={`chart-tab ${tab === "diario" ? "is-active" : ""}`}
          onClick={() => setTab("diario")}
        >
          <LayoutDashboard size={14} /> Métricas Diárias
        </button>
        <button
          className={`chart-tab ${tab === "acumulado" ? "is-active" : ""}`}
          onClick={() => setTab("acumulado")}
        >
          <Zap size={14} /> Evolução Acumulada
        </button>
      </div>

      <div className="chart-card chart-card-tabbed">
        <div className="chart-head">
          <div>
            <div className="chart-title chart-title-row">
              <Zap size={16} className="chart-title-icon" />
              {tab === "diario" ? "Métricas Diárias" : "Evolução Acumulada"}
            </div>
            <div className="chart-sub">
              {tab === "diario"
                ? "Empenhado, liquidado e pago dia a dia"
                : `Acumulado ${scale === "dia" ? "diário" : scale === "semana" ? "semanal" : "mensal"} — clique num ponto para detalhar`}
            </div>
          </div>
          <div className="chart-controls">
            <div className="filter-select filter-select-sm">
              <span className="filter-select-value">
                {scale === "dia" ? "Diário" : scale === "semana" ? "Semanal" : "Mensal"}
              </span>
              <select
                className="select-overlay"
                value={scale}
                onChange={(e) => setScale(e.target.value as Scale)}
                aria-label="Escala"
              >
                <option value="dia">Diário</option>
                <option value="semana">Semanal</option>
                <option value="mes">Mensal</option>
              </select>
              <ChevronDown size={14} />
            </div>
            <button className="icon-btn-sm" title="Zoom out" aria-label="Zoom out">
              <ZoomOut size={14} />
            </button>
            <button className="icon-btn-sm" title="Zoom in" aria-label="Zoom in">
              <ZoomIn size={14} />
            </button>
          </div>
        </div>

        <div className="chart-legend">
          {(["empenhado", "liquidado", "pago"] as const).map((s) => (
            <button
              key={s}
              className={`legend-item ${active[s] ? "" : "is-off"}`}
              onClick={() => setActive((a) => ({ ...a, [s]: !a[s] }))}
            >
              <span className={`legend-dot legend-dot-${COLOR_OF[s]}`} />
              <span className="legend-label">
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </span>
            </button>
          ))}
        </div>

        <div
          className="chart-canvas"
          ref={ref}
          onMouseMove={onMouseMove}
          onMouseLeave={() => setHover(null)}
        >
          {loading || agg.length < 2 ? (
            <div
              style={{
                height: 360,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-muted)",
                fontSize: 13,
              }}
            >
              {loading ? "Carregando dados…" : "Sem dados no período selecionado"}
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              preserveAspectRatio="none"
              style={{ width: "100%", height: 360 }}
            >
              {/* Grid + Y ticks */}
              {yTicks.map((v, i) => (
                <g key={i}>
                  <line
                    x1={PAD.l}
                    x2={VIEW_W - PAD.r}
                    y1={y(v)}
                    y2={y(v)}
                    stroke="var(--border-soft)"
                    strokeDasharray={i === 0 ? undefined : "2 4"}
                    strokeWidth="1"
                  />
                  <text
                    x={PAD.l - 10}
                    y={y(v) + 4}
                    textAnchor="end"
                    fill="var(--text-faint)"
                    fontSize="11"
                    fontFamily="var(--font-mono)"
                  >
                    {fmtTickY(v)}
                  </text>
                </g>
              ))}

              {/* X labels (cada ~10º ponto) */}
              {agg
                .filter((_, i) => i % Math.ceil(agg.length / 11) === 0)
                .map((d, i) => {
                  const idx = agg.indexOf(d);
                  return (
                    <text
                      key={i}
                      x={x(idx)}
                      y={VIEW_H - 12}
                      textAnchor="middle"
                      fill="var(--text-faint)"
                      fontSize="11"
                      fontFamily="var(--font-mono)"
                    >
                      {scale === "mes"
                        ? getMonthName(d.date.getMonth() + 1).slice(0, 3)
                        : fmtDate(d.date)}
                    </text>
                  );
                })}

              {/* Series — fill + line */}
              {series.map((s) => {
                const col = COLOR_OF[s];
                const k = valKey(s);
                const linePath = agg
                  .map((d, i) => (i === 0 ? "M" : "L") + x(i) + " " + y(d[k] as number))
                  .join(" ");
                const fillP = `${linePath} L ${x(agg.length - 1)} ${VIEW_H - PAD.b} L ${x(0)} ${VIEW_H - PAD.b} Z`;
                const gId = `g-${s}-${tab}-${gradId}`;
                return (
                  <g key={s}>
                    <defs>
                      <linearGradient id={gId} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={`var(--c-${col})`} stopOpacity="0.22" />
                        <stop offset="100%" stopColor={`var(--c-${col})`} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={fillP} fill={`url(#${gId})`} />
                    <path
                      d={linePath}
                      fill="none"
                      stroke={`var(--c-${col})`}
                      strokeWidth="2.2"
                      strokeLinejoin="round"
                    />
                  </g>
                );
              })}

              {/* Hover crosshair + dots */}
              {hover != null && (
                <g>
                  <line
                    x1={x(hover)}
                    x2={x(hover)}
                    y1={PAD.t}
                    y2={VIEW_H - PAD.b}
                    stroke="var(--border-strong)"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  {series.map((s) => (
                    <circle
                      key={s}
                      cx={x(hover)}
                      cy={y(agg[hover][valKey(s)] as number)}
                      r="4"
                      fill="var(--surface)"
                      stroke={`var(--c-${COLOR_OF[s]})`}
                      strokeWidth="2"
                    />
                  ))}
                </g>
              )}
            </svg>
          )}

          {hover != null && agg[hover] && (
            <div
              className="chart-tooltip"
              style={{
                left: `${(x(hover) / VIEW_W) * 100}%`,
                transform:
                  x(hover) > VIEW_W * 0.7 ? "translateX(-105%)" : "translateX(8%)",
              }}
            >
              <div className="tt-date">
                {agg[hover].date.toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              {series.map((s) => (
                <div key={s} className="tt-row">
                  <span className={`legend-dot legend-dot-${COLOR_OF[s]}`} />
                  <span className="tt-label">
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </span>
                  <span className="tt-value mono">
                    {formatCurrency(agg[hover][valKey(s)] as number)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  Helper: converte os dados de usePainelData (mensal/diario) em ChartPoint[]
// ══════════════════════════════════════════════════════════════

interface PainelDiarioPoint {
  data: string; // DD/MM/YYYY
  empenhado: number;
  liquidado: number;
  pago: number;
  empAcum: number;
  liqAcum: number;
  pagoAcum: number;
}

/**
 * Adapta os DiarioResult.acumulado/simples do usePainelData pra ChartPoint[].
 * Recebe os arrays do `data.diario` do hook.
 */
export function toChartPoints(
  diarioSimples: readonly { data: string; empenhado: number; liquidado: number; pago: number }[],
  diarioAcumulado: readonly { data: string; empAcum: number; liqAcum: number; pagoAcum: number }[],
): ChartPoint[] {
  // Join por data (key) — ambos vêm já ordenados pela mesma fonte
  const acumByDate = new Map<string, PainelDiarioPoint>();
  for (let i = 0; i < diarioSimples.length; i++) {
    const s = diarioSimples[i];
    const a = diarioAcumulado[i];
    if (!a) continue;
    acumByDate.set(s.data, { ...s, ...a });
  }

  const out: ChartPoint[] = [];
  for (const p of acumByDate.values()) {
    const date = parseDDMMYYYY(p.data);
    if (!date) continue;
    out.push({
      date,
      empenhado: p.empenhado,
      liquidado: p.liquidado,
      pago: p.pago,
      cumEmpenhado: p.empAcum,
      cumLiquidado: p.liqAcum,
      cumPago: p.pagoAcum,
    });
  }
  out.sort((a, b) => a.date.getTime() - b.date.getTime());
  return out;
}
