import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CellValue, ColumnSpec } from "@/components/data-table";
import { cn } from "@/lib/utils";

interface RowDetailDialogProps<T> {
  /** Whether the dialog is open. */
  open: boolean;
  /** Close handler. */
  onClose: () => void;
  /** Columns config — same shape used by parent DataTable. */
  columns: ColumnSpec<T>[];
  /** The row data to display, or null. */
  row: T | null;
  /** Title rendered in dialog header. */
  title?: string;
  /** Subtitle/description rendered below the title. */
  sub?: string;
}

/**
 * RowDetailDialog — exibe label/value de todas as colunas da linha selecionada.
 * Compartilha o ColumnSpec do DataTable parent para reaproveitar formatters.
 */
export function RowDetailDialog<T>({
  open,
  onClose,
  columns,
  row,
  title = "Detalhes do registro",
  sub,
}: RowDetailDialogProps<T>) {
  const getValue = (col: ColumnSpec<T>): CellValue => {
    if (!row) return null;
    if (typeof col.key === "number") {
      return (row as unknown as unknown[])[col.key] as CellValue;
    }
    return (row as Record<string, unknown>)[col.key as string] as CellValue;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {sub && <DialogDescription>{sub}</DialogDescription>}
        </DialogHeader>
        {row && (
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-[max-content_1fr] sm:gap-x-6 sm:gap-y-2 text-sm">
            {columns.map((c) => {
              const v = getValue(c);
              const display = c.format ? c.format(v) : String(v ?? "");
              return (
                <div
                  key={String(c.key)}
                  className="contents"
                >
                  <dt className="font-medium text-muted-foreground">
                    {c.label}
                  </dt>
                  <dd
                    className={cn(
                      "break-words",
                      c.align === "right" && "sm:text-right tabular-nums",
                    )}
                  >
                    {display || <span className="text-muted-foreground">—</span>}
                  </dd>
                </div>
              );
            })}
          </dl>
        )}
      </DialogContent>
    </Dialog>
  );
}
