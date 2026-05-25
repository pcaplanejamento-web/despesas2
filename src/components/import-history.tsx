import { useState, useEffect } from "react";
import { Clock, CheckCircle2, XCircle, Database } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  readImportHistory,
  formatDuration,
  type ImportHistoryEntry,
} from "@/lib/import-history";
import { useStore } from "@/store";
import { cn } from "@/lib/utils";

interface ImportHistoryProps {
  /** Limita o número de entries exibidas. Default mostra todas (até 20 stored). */
  limit?: number;
}

/**
 * ImportHistory — observabilidade persistente dos imports passados.
 *
 * Lê de localStorage (via @/lib/import-history). Re-lê quando o store sinaliza
 * que um import terminou (state.ui.importing transition de true → false).
 *
 * Mostra: ano, status, duração, total de registros, se foi do cache, timestamp.
 */
export function ImportHistory({ limit }: ImportHistoryProps) {
  const [entries, setEntries] = useState<ImportHistoryEntry[]>(() => readImportHistory());
  const importing = useStore((s) => s.ui.importing);

  // Re-le quando importing cai de true → false (import acabou de gravar)
  useEffect(() => {
    if (!importing) {
      setEntries(readImportHistory());
    }
  }, [importing]);

  const displayEntries = limit ? entries.slice(0, limit) : entries;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="size-4" />
          Histórico de Importações
        </CardTitle>
        <CardDescription>
          {entries.length === 0
            ? "Nenhum import realizado ainda."
            : `${entries.length} ${entries.length === 1 ? "registro" : "registros"} (últimos 20 mantidos).`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground">
            <Database className="size-8 opacity-50" />
            <p className="text-sm">
              Imports aparecerão aqui automaticamente após a primeira execução.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Quando</th>
                  <th className="px-3 py-2 text-left font-medium">Ano</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Duração</th>
                  <th className="px-3 py-2 text-right font-medium">Registros</th>
                  <th className="px-3 py-2 text-left font-medium">Origem</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {displayEntries.map((e) => (
                  <ImportHistoryRow key={e.startedAt + e.year} entry={e} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ImportHistoryRow({ entry }: { entry: ImportHistoryEntry }) {
  const started = new Date(entry.startedAt);
  const when = started.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <tr className="hover:bg-muted/40">
      <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums" title={started.toISOString()}>
        {when}
      </td>
      <td className="px-3 py-2 font-medium tabular-nums">{entry.year}</td>
      <td className="px-3 py-2">
        {entry.status === "done" ? (
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="mr-1 size-3" />
            Concluído
          </Badge>
        ) : (
          <Badge variant="outline" className="border-rose-500/40 text-rose-600 dark:text-rose-400" title={entry.error}>
            <XCircle className="mr-1 size-3" />
            Erro
          </Badge>
        )}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{formatDuration(entry.durationMs)}</td>
      <td className="px-3 py-2 text-right tabular-nums">
        {entry.totalRegistros > 0 ? entry.totalRegistros.toLocaleString("pt-BR") : "—"}
      </td>
      <td className="px-3 py-2">
        <span
          className={cn(
            "text-xs",
            entry.fromCache ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
          )}
        >
          {entry.fromCache ? "cache" : "API"}
        </span>
      </td>
    </tr>
  );
}
