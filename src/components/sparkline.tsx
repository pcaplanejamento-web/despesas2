// Sparkline — mini gráfico SVG inline com fill gradient + stroke + dot final.
// Replica fiel do design (components.jsx Sparkline + KpiCardSparkline).

import { useId } from "react";

export type SparklineColor = "blue" | "green" | "teal" | "amber" | "rose" | "violet";

interface SparklineProps {
  /** Série de valores. Pelo menos 2 pontos pra renderizar linha. */
  data: number[];
  /** Cor accent (referencia var(--c-{color})). */
  color: SparklineColor;
  /** Width (px). Default 600 — escala via viewBox. */
  w?: number;
  /** Height (px). Default 40. */
  h?: number;
  /** Render fill gradient abaixo da linha. Default true. */
  fill?: boolean;
  /** Render dot no último ponto. Default false. */
  dot?: boolean;
  /** Stroke width. Default 1.6. */
  strokeWidth?: number;
  /** Estende a SVG via 100% width. Default true. */
  stretch?: boolean;
}

/**
 * Sparkline SVG — usado em KpiCard (stretch full-width) ou inline.
 * O componente usa `viewBox + preserveAspectRatio="none"` pra esticar
 * proporcionalmente sem distorcer stroke graças a `vector-effect`.
 */
export function Sparkline({
  data,
  color,
  w = 600,
  h = 40,
  fill = true,
  dot = false,
  strokeWidth = 1.6,
  stretch = true,
}: SparklineProps) {
  const id = useId();

  if (!data || data.length < 2) {
    return (
      <svg width={w} height={h} style={{ display: "block" }}>
        <line x1={0} y1={h - 1} x2={w} y2={h - 1} stroke="var(--border)" />
      </svg>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map<[number, number]>((v, i) => [
    i * step,
    h - 3 - ((v - min) / range) * (h - 8),
  ]);
  const linePath = pts
    .map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1))
    .join(" ");
  const fillPath = `${linePath} L ${w} ${h} L 0 ${h} Z`;
  const lastPoint = pts[pts.length - 1];
  const gradId = `spark-grad-${id.replace(/:/g, "")}`;

  const stretchStyle: React.CSSProperties = stretch
    ? { width: "100%", height: h, display: "block" }
    : { display: "block" };

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={stretchStyle}
      width={stretch ? undefined : w}
      height={stretch ? undefined : h}
    >
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={`var(--c-${color})`} stopOpacity="0.22" />
          <stop offset="100%" stopColor={`var(--c-${color})`} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={fillPath} fill={`url(#${gradId})`} />}
      <path
        d={linePath}
        fill="none"
        stroke={`var(--c-${color})`}
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      {dot && (
        <circle
          cx={lastPoint[0]}
          cy={lastPoint[1]}
          r="2.5"
          fill={`var(--c-${color})`}
        />
      )}
    </svg>
  );
}
