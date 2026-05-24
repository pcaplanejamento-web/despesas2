import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ══════════════════════════════════════════════════════════════
//  Column meta — define como uma coluna se comporta
// ══════════════════════════════════════════════════════════════

/** Tipo aceito pelos formatters (formatCurrency, formatPercent etc). */
export type CellValue = string | number | null | undefined;

export interface ColumnSpec<T> {
  /** Chave do dado na linha (index numérico ou nome de prop). */
  key: number | keyof T;
  /** Label exibida no header. */
  label: string;
  /** Alinhamento da célula (default: left, right p/ money). */
  align?: "left" | "right" | "center";
  /** Função que formata o valor para display. */
  format?: (value: CellValue) => string;
  /** Se true, soma os valores e exibe no rodapé. */
  sum?: boolean;
  /** Habilita ordenação. */
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: ColumnSpec<T>[];
  rows: T[];
  /** Page size (linhas por página). Default 50. */
  pageSize?: number;
  /** Mostra busca no topo. Default true. */
  searchable?: boolean;
  /** Mostra linha de totais no rodapé (col `sum: true`). Default true. */
  showTotals?: boolean;
  /** Handler de clique em linha. */
  onRowClick?: (row: T) => void;
  /** Texto exibido quando rows está vazio. */
  emptyMessage?: string;
  /** Nome do arquivo de export CSV (sem .csv). */
  exportName?: string;
}

/**
 * DataTable shadcn — sort, search, paginação, totals row, export CSV.
 * Substitui as 10 sub-tabelas legacy + 5 rotas de tabelas Dattago.
 */
export function DataTable<T>({
  columns,
  rows,
  pageSize = 50,
  searchable = true,
  showTotals = true,
  onRowClick,
  emptyMessage = "Sem registros",
  exportName,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  // Converte ColumnSpec → ColumnDef do TanStack
  const tColumns = useMemo<ColumnDef<T>[]>(
    () =>
      columns.map((c) => ({
        id: String(c.key),
        accessorFn: (row: T) =>
          typeof c.key === "number"
            ? (row as unknown as unknown[])[c.key]
            : (row as Record<string, unknown>)[c.key as string],
        header: c.label,
        cell: ({ getValue }) => {
          const v = getValue() as CellValue;
          return c.format ? c.format(v) : String(v ?? "");
        },
        enableSorting: c.sortable ?? true,
        sortingFn: (a, b, colId) => {
          const av = a.getValue<unknown>(colId);
          const bv = b.getValue<unknown>(colId);
          if (typeof av === "number" && typeof bv === "number") return av - bv;
          return String(av ?? "").localeCompare(String(bv ?? ""), "pt-BR");
        },
      })),
    [columns],
  );

  const table = useReactTable({
    data: rows,
    columns: tColumns,
    state: { sorting, globalFilter, pagination: { pageIndex: 0, pageSize } },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _colId, filterValue: string) => {
      const q = filterValue.toLowerCase();
      return row.getAllCells().some((cell) => {
        const v = cell.getValue();
        return String(v ?? "").toLowerCase().includes(q);
      });
    },
  });

  // Linha de totais (para colunas com sum: true)
  const totals = useMemo(() => {
    if (!showTotals) return null;
    const sums: Record<string, number> = {};
    for (const c of columns) {
      if (!c.sum) continue;
      let total = 0;
      for (const r of table.getFilteredRowModel().rows) {
        const v = r.getValue<unknown>(String(c.key));
        if (typeof v === "number") total += v;
      }
      sums[String(c.key)] = total;
    }
    return sums;
  }, [columns, table, showTotals, rows, globalFilter]);

  // CSV export
  const handleExport = () => {
    const visibleRows = table.getFilteredRowModel().rows;
    const headers = columns.map((c) => `"${c.label.replace(/"/g, '""')}"`);
    const csvLines = [headers.join(",")];
    for (const r of visibleRows) {
      const cells = columns.map((c) => {
        const v = r.getValue<unknown>(String(c.key)) as CellValue;
        const s = c.format ? c.format(v) : String(v ?? "");
        return `"${s.replace(/"/g, '""')}"`;
      });
      csvLines.push(cells.join(","));
    }
    const blob = new Blob(
      ["﻿" + csvLines.join("\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportName ?? "dattago"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalRows = table.getFilteredRowModel().rows.length;
  const pageRows = table.getRowModel().rows;
  const { pageIndex, pageSize: ps } = table.getState().pagination;
  const start = pageIndex * ps + 1;
  const end = Math.min((pageIndex + 1) * ps, totalRows);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {searchable && (
          <div className="relative max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar…"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9"
            />
          </div>
        )}
        <div className="ml-auto text-xs text-muted-foreground">
          {totalRows.toLocaleString("pt-BR")} {totalRows === 1 ? "registro" : "registros"}
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download /> CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h, i) => {
                  const col = columns[i];
                  const sorted = h.column.getIsSorted();
                  return (
                    <TableHead
                      key={h.id}
                      className={cn(
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center",
                        h.column.getCanSort() && "cursor-pointer select-none",
                      )}
                      onClick={h.column.getToggleSortingHandler()}
                    >
                      <span
                        className={cn(
                          "inline-flex items-center gap-1",
                          col.align === "right" && "flex-row-reverse",
                        )}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {h.column.getCanSort() &&
                          (sorted === "asc" ? (
                            <ArrowUp className="size-3" />
                          ) : sorted === "desc" ? (
                            <ArrowDown className="size-3" />
                          ) : (
                            <ArrowUpDown className="size-3 opacity-40" />
                          ))}
                      </span>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((r) => (
                <TableRow
                  key={r.id}
                  className={onRowClick ? "cursor-pointer" : ""}
                  onClick={onRowClick ? () => onRowClick(r.original) : undefined}
                >
                  {r.getVisibleCells().map((cell, i) => {
                    const col = columns[i];
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          col.align === "right" && "text-right tabular-nums",
                          col.align === "center" && "text-center",
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
          {totals && Object.keys(totals).length > 0 && (
            <tfoot className="border-t bg-muted/50 font-medium">
              <tr>
                {columns.map((c, i) => (
                  <td
                    key={String(c.key)}
                    className={cn(
                      "p-3 align-middle text-sm",
                      c.align === "right" && "text-right tabular-nums",
                    )}
                  >
                    {i === 0
                      ? "Total"
                      : c.sum && totals[String(c.key)] !== undefined
                        ? (c.format
                            ? c.format(totals[String(c.key)])
                            : totals[String(c.key)].toLocaleString("pt-BR"))
                        : ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Exibindo {totalRows ? start.toLocaleString("pt-BR") : 0}–{end.toLocaleString("pt-BR")} de {totalRows.toLocaleString("pt-BR")}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeft /> Anterior
          </Button>
          <span className="tabular-nums">
            Pág. {pageIndex + 1} de {table.getPageCount() || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Próxima <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
