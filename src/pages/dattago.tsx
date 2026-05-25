// DattagoPage — rota `/dattago` (Integrações).
// Compõe: NativeSelect (ano), Button×2, ApiStatusGrid, ImportHistory + Cards.
// Orquestra import via useImportDattago. Mostra anos carregados na sessão +
// histórico persistente das últimas 20 execuções.

import { useState } from "react";
import { CheckCircle2, Database, Loader2, RefreshCw, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { ApiStatusGrid } from "@/components/api-status-grid";
import { ImportHistory } from "@/components/import-history";
import { useImportDattago } from "@/hooks/use-import-dattago";
import { useStore } from "@/store";

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
              <NativeSelect
                id="year"
                value={String(year)}
                onChange={(v) => setYear(Number(v))}
                disabled={isImporting}
                options={AVAILABLE_YEARS.map((y) => ({
                  value: String(y),
                  label: `${y}${loadedYears.has(y) ? " ✓" : ""}`,
                }))}
              />
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
            <ApiStatusGrid counts={state.perApi} labels={API_LABELS} />
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

      {/* Card 4: histórico persistente (observabilidade) */}
      <ImportHistory />
    </div>
  );
}
