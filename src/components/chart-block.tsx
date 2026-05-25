import type { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ChartMode } from "@/store";

interface ChartBlockProps {
  /** Título exibido no header do card. */
  title: string;
  /** Subtítulo/descrição abaixo do título. */
  sub?: string;
  /** Modo atual do chart (diário/mensal). */
  mode: ChartMode;
  /** Handler de troca de modo. */
  onModeChange: (mode: ChartMode) => void;
  /** Chart filho (Bar/Line do react-chartjs-2). */
  children: ReactNode;
  /** Altura do chart container (px). Default 280. */
  height?: number;
}

/**
 * ChartBlock — wrapper de Card + Tabs (modo diário/mensal) + chart filho.
 * Reutilizado pelo Painel para os 2 charts (Bar empilhado e Line acumulado).
 */
export function ChartBlock({
  title,
  sub,
  mode,
  onModeChange,
  children,
  height = 280,
}: ChartBlockProps) {
  return (
    <div className="glass-card px-5 py-4 sm:px-[22px] sm:py-5">
      <div className="relative z-[1] mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-[16px] font-semibold tracking-[-0.01em]">{title}</h3>
          {sub && <p className="text-[12.5px] text-[var(--text-muted)]">{sub}</p>}
        </div>
        <Tabs value={mode} onValueChange={(v) => onModeChange(v as ChartMode)}>
          <TabsList>
            <TabsTrigger value="diario">Diário</TabsTrigger>
            <TabsTrigger value="mensal">Mensal</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div style={{ height }} className="relative z-[1]">
        {children}
      </div>
    </div>
  );
}
