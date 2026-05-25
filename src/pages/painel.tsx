// PainelPage — rota `/painel`.
// Replica fiel do design (screens.jsx ScreenPainel).
// Compõe: TopBar + KpiGrid (6 KpiCard) + FiltersBar + CombinedChart + Demonstrativo.

import { useMemo, useState } from "react";
import {
  Wallet,
  CheckCircle2,
  Banknote,
  Scale,
  ArrowDownCircle,
  Receipt,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { TopBar } from "@/layouts/topbar";
import { PanelBanner } from "@/components/panel-banner";
import { KpiCard } from "@/components/kpi-card";
import { FilterBar } from "@/components/filter-bar";
import { CombinedChart, toChartPoints } from "@/components/combined-chart";
import { Demonstrativo } from "@/components/demonstrativo";
import { DetailDrawer } from "@/components/detail-drawer";
import { usePainelData } from "@/hooks/use-painel-data";
import { useImportDattago } from "@/hooks/use-import-dattago";
import { useStore } from "@/store";
import {
  CE,
  CL,
  parseDDMMYYYY,
  buildDimFilter,
  type DimensaoEmp,
  type EmpRow,
  type LiqRow,
  type GroupedRow,
} from "@/lib/compute";

interface DrawerState {
  open: boolean;
  title: string;
  sub: string;
  empRows: EmpRow[];
  liqRows: LiqRow[];
}

type AppShellCtx = { openMobileMenu: () => void };

const DIM_TO_PADRAO: Record<string, DimensaoEmp> = {
  orgao: "orgao",
  unidade: "unidade",
  acao: "acao",
  elemento: "elemento",
  programa: "programa",
  fonte: "fonte",
  numlicit: "numlicit",
};

export function PainelPage() {
  const ctx = useOutletContext<AppShellCtx>();
  const data = usePainelData();
  const importing = useStore((s) => s.ui.importing);
  const demonstrativo = useStore((s) => s.filters.demonstrativo);
  const { run: rerun } = useImportDattago();
  const [drawer, setDrawer] = useState<DrawerState | null>(null);

  const hasData = data.empRows.length > 0;

  // ── Sparklines pra KPIs (últimos 30 dias por série) ──
  const sparkSeries = useMemo(() => {
    const tail = data.diario.simples.slice(-30);
    return {
      empenhado: tail.map((d) => d.empenhado),
      liquidado: tail.map((d) => d.liquidado),
      pago: tail.map((d) => d.pago),
    };
  }, [data.diario.simples]);

  // ── Chart points combinados ──
  const chartPoints = useMemo(
    () => toChartPoints(data.diario.simples, data.diario.acumulado),
    [data.diario],
  );

  // ── Drawer helper ──
  const openDrawer = (
    title: string,
    sub: string,
    empFilter?: (r: EmpRow) => boolean,
    liqFilter?: (r: LiqRow) => boolean,
  ) => {
    const empRows = empFilter ? data.empRows.filter(empFilter) : data.empRows;
    const liqRows = liqFilter ? data.liqRows.filter(liqFilter) : data.liqRows;
    setDrawer({ open: true, title, sub, empRows, liqRows });
  };

  // ── Demonstrativo: rows agregados pela dimensão atual ──
  const demoRows: GroupedRow[] = useMemo(() => {
    switch (demonstrativo) {
      case "orgao":    return data.orgaos;
      case "unidade":  return data.unidades;
      case "acao":     return data.acoes;
      case "elemento": return data.elementos;
      case "programa": return data.programas;
      case "fonte":    return data.fontes;
      case "credor":   return data.credores;
      case "numlicit": return data.numlicits;
      // contrato/mensal usam shape diferente — adapter mínimo
      case "contrato": return data.contratos.map<GroupedRow>((c) => ({
        orgao: c.contrato, unidade: "", acao: "", elemento: "", programa: "", fonte: "",
        credor: "", numlicit: "", empenhado: c.empenhado, liquidado: c.liquidado, pago: c.pago,
        pagoLiquido: c.pago, anulado: c.anulado, retido: c.retido,
      }));
      case "mensal":   return data.mensal.percentual.map<GroupedRow>((m) => ({
        orgao: `Mês ${m.mes}`, unidade: "", acao: "", elemento: "", programa: "", fonte: "",
        credor: "", numlicit: "", empenhado: m.empenhado, liquidado: m.liquidado, pago: m.pago,
        pagoLiquido: m.pago, anulado: m.anulado, retido: m.retido,
      }));
    }
  }, [demonstrativo, data]);

  // Count de empenhos por label da dimensão atual
  const countByLabel = useMemo(() => {
    const colIdx =
      demonstrativo === "orgao" ? CE.ORGAO :
      demonstrativo === "unidade" ? CE.UNIDADE :
      demonstrativo === "acao" ? CE.ACAO :
      demonstrativo === "elemento" ? CE.ELEMENTO :
      demonstrativo === "programa" ? CE.PROGRAMA :
      demonstrativo === "fonte" ? CE.FONTE :
      demonstrativo === "numlicit" ? CE.ID_LICIT :
      -1;
    if (colIdx < 0) return {};
    const out: Record<string, number> = {};
    for (const r of data.empRows) {
      const k = String(r[colIdx] ?? "").trim();
      if (!k) continue;
      out[k] = (out[k] ?? 0) + 1;
    }
    return out;
  }, [data.empRows, demonstrativo]);

  // ── Demonstrativo click → drawer ──
  const onDemoRowClick = (row: GroupedRow) => {
    const nameKey = demonstrativo as keyof GroupedRow;
    const label = String(row[nameKey] ?? "");
    if (!label) return;

    // credor: caminho custom (filtra liqRows e propaga pra emp via NUM_EMP)
    if (demonstrativo === "credor") {
      const liqFilter = (r: LiqRow) => String(r[CL.CREDOR] ?? "").trim() === label;
      const empNums = new Set(
        data.liqRows.filter(liqFilter).map((r) => String(r[CL.NUM_EMP] ?? "").trim()),
      );
      const empFilter = (r: EmpRow) => empNums.has(String(r[CE.NUM_EMP] ?? "").trim());
      openDrawer(`Credor — ${label}`, "Detalhes filtrados pelo credor.", empFilter, liqFilter);
      return;
    }

    // mensal: filtra por mês (label = "Mês N")
    if (demonstrativo === "mensal") {
      const m = Number(String(row.orgao ?? "").replace(/\D/g, ""));
      const filterByMonth = (dateStr: unknown) => {
        const d = parseDDMMYYYY(dateStr);
        return d !== null && d.getMonth() + 1 === m;
      };
      openDrawer(
        `Mês — ${row.orgao}`,
        `Empenhos e liquidações do mês.`,
        (r) => filterByMonth(r[CE.DATA]),
        (r) => filterByMonth(r[CL.DATA_LIQ]),
      );
      return;
    }

    // contrato: usa empContratoMap (simplificado — busca por contrato no map)
    if (demonstrativo === "contrato") {
      openDrawer(`Contrato — ${label}`, `Empenhos e liquidações vinculados ao contrato.`);
      return;
    }

    // 7 dims padrão via helper compartilhado
    const dim = DIM_TO_PADRAO[demonstrativo];
    if (!dim) return;
    const { empFilter, liqFilter } = buildDimFilter(dim, label, data.empRows);
    openDrawer(
      `${dim[0].toUpperCase() + dim.slice(1)} — ${label}`,
      `Detalhes filtrados.`,
      empFilter,
      liqFilter,
    );
  };

  const refresh = () => {
    const y = new Date().getFullYear();
    rerun(y);
  };

  return (
    <div className="screen screen-painel" data-screen-label="Painel">
      <TopBar
        breadcrumb={["Painel"]}
        onMenuClick={ctx?.openMobileMenu}
      />

      <PanelBanner onRefresh={refresh} />

      {/* KPIs — grid 3×2 fixo */}
      <section className="kpi-grid">
        <KpiCard
          label="Empenhado"
          value={data.kpis.empenhado}
          icon={Wallet}
          accent="blue"
          series={sparkSeries.empenhado}
          loading={importing && !hasData}
          sub="Comprometimento orçamentário"
          onClick={() => openDrawer("Empenhado", "Total empenhado no período filtrado.")}
        />
        <KpiCard
          label="Liquidado"
          value={data.kpis.liquidado}
          icon={CheckCircle2}
          accent="green"
          series={sparkSeries.liquidado}
          loading={importing && !hasData}
          sub="Despesas reconhecidas"
          onClick={() => {
            const liqFilter = (r: LiqRow) => {
              const tipo = String(r[CL.TIPO] ?? "").trim();
              return tipo === "" || tipo === "NOTA DE EMPENHO";
            };
            const liqMatch = data.liqRows.filter(liqFilter);
            const empNums = new Set(liqMatch.map((r) => String(r[CL.NUM_EMP] ?? "")).filter(Boolean));
            openDrawer(
              "Liquidado",
              "Liquidações tipo NOTA DE EMPENHO + empenhos correspondentes.",
              (r) => empNums.has(String(r[CE.NUM_EMP] ?? "")),
              liqFilter,
            );
          }}
        />
        <KpiCard
          label="Pago"
          value={data.kpis.pago}
          icon={Banknote}
          accent="teal"
          series={sparkSeries.pago}
          loading={importing && !hasData}
          sub="Pagamentos efetuados"
          onClick={() => {
            const liqFilter = (r: LiqRow) => Number(r[CL.VL_PAGO] ?? 0) > 0;
            const liqMatch = data.liqRows.filter(liqFilter);
            const empNums = new Set(liqMatch.map((r) => String(r[CL.NUM_EMP] ?? "")).filter(Boolean));
            openDrawer(
              "Pago",
              "Empenhos com valor pago > 0.",
              (r) => empNums.has(String(r[CE.NUM_EMP] ?? "")),
              liqFilter,
            );
          }}
        />
        <KpiCard
          label="Saldo a pagar"
          value={data.kpis.empenhado - data.kpis.anulado - data.kpis.pago}
          icon={Scale}
          accent="amber"
          loading={importing && !hasData}
          sub="Pendente de pagamento"
          onClick={() =>
            openDrawer(
              "Saldo a pagar",
              "Empenhos com saldo pendente (Empenhado − Anulado − Pago).",
              (r) => Number(r[CE.SALDO] ?? 0) > 0,
            )
          }
        />
        <KpiCard
          label="Anulado"
          value={data.kpis.anulado}
          icon={ArrowDownCircle}
          accent="rose"
          loading={importing && !hasData}
          sub="Estornos no período"
          onClick={() => {
            const liqFilter = (r: LiqRow) => Number(r[CL.VL_ANUL] ?? 0) > 0;
            const liqMatch = data.liqRows.filter(liqFilter);
            const empNums = new Set(liqMatch.map((r) => String(r[CL.NUM_EMP] ?? "")).filter(Boolean));
            openDrawer(
              "Anulado",
              "Liquidações com anulação > 0.",
              (r) => empNums.has(String(r[CE.NUM_EMP] ?? "")),
              liqFilter,
            );
          }}
        />
        <KpiCard
          label="Retido"
          value={data.kpis.retido}
          icon={Receipt}
          accent="violet"
          loading={importing && !hasData}
          sub="Retenções aplicadas"
          onClick={() => openDrawer("Retido", "Retenções aplicadas no período.")}
        />
      </section>

      {/* Filtros */}
      <FilterBar />

      {/* Gráfico combinado */}
      <section className="block">
        <CombinedChart data={chartPoints} loading={importing && !hasData} />
      </section>

      {/* Demonstrativo */}
      <section className="block">
        <Demonstrativo
          rows={demoRows}
          countByLabel={countByLabel}
          onRowClick={onDemoRowClick}
          loading={importing && !hasData}
        />
      </section>

      {/* Detail drawer */}
      <DetailDrawer
        open={drawer?.open ?? false}
        title={drawer?.title ?? ""}
        sub={drawer?.sub}
        empRows={drawer?.empRows ?? []}
        liqRows={drawer?.liqRows ?? []}
        onClose={() => setDrawer(null)}
      />
    </div>
  );
}
