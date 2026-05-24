import { useState } from "react";
import { CheckCircle2, Database, Loader2, RefreshCw, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useImportDattago } from "@/hooks/use-import-dattago";
import { useStore } from "@/store";
import { cn } from "@/lib/utils";

const CURRENT_YEAR = new Date().getFullYear();
const AVAILABLE_YEARS = Array.from(
  { length: CURRENT_YEAR - 2019 },
  (_, i) => CURRENT_YEAR - i,
);

const API_LABELS = {
  emp:  "Empenhos",
  liq:  "Liquidações",
  pgto: "Pagamentos",
  rec:  "Receita",
  ctr:  "Contratos",
} as const;

export function DattagoPage() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const { state, run, reset } = useImportDattago();
  const loadedYears = useStore((s) => s.data.loadedYears);
  const sortedYears = [...loadedYears].sort((a, b) => b - a);

  const isImporting = state.status === "running";
  const isDone = state.status === "done";
  const yearAlreadyLoaded = loadedYears.has(year);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Integrações</h1>
        <p className="text-sm text-muted-foreground">
          Importação de dados da API Dattago — 5 endpoints em paralelo
          (Empenhos, Liquidações, Pagamentos, Receita, Contratos).
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Card 1: controles */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Buscar dados</CardTitle>
            <CardDescription>Selecione o ano e importe.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="year" className="text-sm font-medium">
                Ano
              </label>
              <select
                id="year"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                disabled={isImporting}
                className={cn(
                  "h-9 w-full rounded-md border bg-background px-3 text-sm shadow-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                {AVAILABLE_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}{loadedYears.has(y) ? " ✓" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => run(year)}
                disabled={isImporting || yearAlreadyLoaded}
              >
                {isImporting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Search />
                )}
                {isImporting ? "Importando…" : yearAlreadyLoaded ? "Já carregado" : "Buscar"}
              </Button>
              <Button variant="outline" onClick={reset} disabled={isImporting}>
                <Trash2 /> Limpar cache
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: progresso */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isImporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isDone ? (
                <CheckCircle2 className="size-4 text-green-500" />
              ) : (
                <RefreshCw className="size-4 text-muted-foreground" />
              )}
              Status
            </CardTitle>
            <CardDescription>
              {state.status === "idle" && "Aguardando importação."}
              {isImporting && state.fromCache && "Lendo de cache local…"}
              {isImporting && !state.fromCache && "Buscando dados das 5 APIs em paralelo…"}
              {isDone &&
                `Concluído — ${state.totalRegistros.toLocaleString("pt-BR")} registros importados.`}
              {state.status === "error" && `Erro: ${state.error}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {(Object.keys(API_LABELS) as Array<keyof typeof API_LABELS>).map((api) => (
                <div
                  key={api}
                  className="rounded-md border bg-muted/40 px-3 py-2 text-center"
                >
                  <div className="text-xs text-muted-foreground">
                    {API_LABELS[api]}
                  </div>
                  <div className="mt-1 text-base font-semibold tabular-nums">
                    {state.perApi[api]?.toLocaleString("pt-BR") ?? 0}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Card 3: anos carregados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="size-4" />
            Anos carregados nesta sessão
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedYears.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum ano carregado ainda. Selecione um ano acima e clique em Buscar.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {sortedYears.map((y) => (
                <span
                  key={y}
                  className="inline-flex items-center gap-1 rounded-md border bg-accent/30 px-2.5 py-1 text-xs font-medium"
                >
                  <CheckCircle2 className="size-3 text-green-500" />
                  {y}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
