import { useState } from "react";
import { FileText, Receipt } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type ColumnSpec } from "@/components/data-table";
import { RowDetailDialog } from "@/components/row-detail-dialog";
import { formatCurrency } from "@/lib/config";
import type { EmpRow, LiqRow } from "@/lib/compute";
import { CE, CL } from "@/lib/compute";

// ── Colunas reutilizáveis das tabs ────────────────────────────────────────────

export const EMP_COLS: ColumnSpec<EmpRow>[] = [
  { key: CE.DATA,      label: "Data" },
  { key: CE.ORGAO,     label: "Órgão" },
  { key: CE.FORNECEDOR, label: "Credor" },
  { key: CE.NUM_EMP,   label: "Nº Empenho" },
  { key: CE.ACAO,      label: "Ação" },
  { key: CE.ELEMENTO,  label: "Elemento" },
  { key: CE.VL_EMP,    label: "Empenhado", align: "right", format: formatCurrency, sum: true },
  { key: CE.VL_LIQ,    label: "Liquidado", align: "right", format: formatCurrency, sum: true },
  { key: CE.VL_PAGO,   label: "Pago",      align: "right", format: formatCurrency, sum: true },
];

export const LIQ_COLS: ColumnSpec<LiqRow>[] = [
  { key: CL.DATA_LIQ, label: "Data Liq." },
  { key: CL.CREDOR,   label: "Credor" },
  { key: CL.NUM_LIQ,  label: "Nº Liquidação" },
  { key: CL.NUM_EMP,  label: "Nº Empenho" },
  { key: CL.VALOR,    label: "Valor", align: "right", format: formatCurrency, sum: true },
  { key: CL.VL_PAGO,  label: "Pago",  align: "right", format: formatCurrency, sum: true },
];

// ── Drawer ────────────────────────────────────────────────────────────────────

export interface DetailDrawerProps {
  open: boolean;
  title: string;
  sub?: string;
  empRows: EmpRow[];
  liqRows: LiqRow[];
  onClose: () => void;
}

/**
 * DetailDrawer — organism que reúne 2 DataTables (Empenhos + Gerencial) num
 * shadcn `<Sheet side="right" width="lg">`. Cada linha clicável abre um
 * `RowDetailDialog` com label/value das colunas.
 */
export function DetailDrawer({
  open,
  title,
  sub,
  empRows,
  liqRows,
  onClose,
}: DetailDrawerProps) {
  const [empRow, setEmpRow] = useState<EmpRow | null>(null);
  const [liqRow, setLiqRow] = useState<LiqRow | null>(null);

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="right"
        width="lg"
        className="flex w-full flex-col gap-0 sm:max-w-3xl md:max-w-4xl lg:max-w-5xl"
      >
        <SheetHeader className="border-b pb-4">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FileText className="size-5" />
            </span>
            <div className="space-y-1">
              <SheetTitle>{title}</SheetTitle>
              {sub && <SheetDescription>{sub}</SheetDescription>}
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="empenhos" className="mt-4 flex min-h-0 flex-1 flex-col">
          <TabsList className="w-fit">
            <TabsTrigger value="empenhos">
              <Receipt /> Empenhos ({empRows.length.toLocaleString("pt-BR")})
            </TabsTrigger>
            <TabsTrigger value="gerencial">
              <FileText /> Gerencial ({liqRows.length.toLocaleString("pt-BR")})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="empenhos" className="mt-4 min-h-0 flex-1 overflow-auto">
            <DataTable
              columns={EMP_COLS}
              rows={empRows}
              exportName="empenhos-detail"
              onRowClick={(r) => setEmpRow(r)}
              emptyMessage="Sem empenhos para o filtro selecionado."
            />
          </TabsContent>

          <TabsContent value="gerencial" className="mt-4 min-h-0 flex-1 overflow-auto">
            <DataTable
              columns={LIQ_COLS}
              rows={liqRows}
              exportName="liquidacoes-detail"
              onRowClick={(r) => setLiqRow(r)}
              emptyMessage="Sem liquidações para o filtro selecionado."
            />
          </TabsContent>
        </Tabs>
      </SheetContent>

      <RowDetailDialog
        open={empRow !== null}
        onClose={() => setEmpRow(null)}
        columns={EMP_COLS}
        row={empRow}
        title="Detalhes do empenho"
        sub="Linha de empRows enriquecida."
      />
      <RowDetailDialog
        open={liqRow !== null}
        onClose={() => setLiqRow(null)}
        columns={LIQ_COLS}
        row={liqRow}
        title="Detalhes da liquidação"
        sub="Linha de liqRows enriquecida."
      />
    </Sheet>
  );
}
