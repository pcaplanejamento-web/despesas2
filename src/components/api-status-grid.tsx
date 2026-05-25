interface ApiStatusGridProps {
  counts: Record<string, number>;
  labels: Record<string, string>;
}

/**
 * Grid de contadores por API — usado na Integrações (DattagoPage).
 * Mostra um quadradinho por endpoint com label + total formatado pt-BR.
 */
export function ApiStatusGrid({ counts, labels }: ApiStatusGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {Object.entries(labels).map(([key, label]) => (
        <div
          key={key}
          className="rounded-md border bg-muted/40 px-3 py-2 text-center"
        >
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-1 text-base font-semibold tabular-nums">
            {(counts[key] ?? 0).toLocaleString("pt-BR")}
          </div>
        </div>
      ))}
    </div>
  );
}
