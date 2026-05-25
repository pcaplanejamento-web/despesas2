import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            {sub && <CardDescription>{sub}</CardDescription>}
          </div>
          <Tabs
            value={mode}
            onValueChange={(v) => onModeChange(v as ChartMode)}
          >
            <TabsList>
              <TabsTrigger value="diario">Diário</TabsTrigger>
              <TabsTrigger value="mensal">Mensal</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height }} className="relative">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
