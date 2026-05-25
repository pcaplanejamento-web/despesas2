// store/index.ts — Zustand store substituindo o store custom vanilla.
//
// Shape espelha as slices anteriores (data/filters/ui/charts) para minimizar
// retrabalho na migração. APIs:
//
//   const empenhos = useStore(s => s.data.enriched.empenhos)
//   useStore.getState().setEnrichedEmpenhos(rows)
//   useStore.getState().transaction(() => { ... }) — batch sem disparar
//     re-renders intermediários (Zustand já faz batching natural com
//     unstable_batchedUpdates, mas mantemos a API por paridade)

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  CtrRow,
  EmpRow,
  LiqRow,
  PgtoRow,
  Periodo,
  RecRow,
  Visao,
  KpiResults,
  MensalResult,
  DiarioResult,
  GroupedRow,
  ContratoSummary,
  ContratoMap,
} from "@/lib/compute";

// Linhas enriquecidas têm colunas extras (Tipo, N. Contrato, Unid. Orç.) mas
// continuam sendo ReadonlyArray<string | number | null>, então reusamos os
// mesmos tipos base. Alias semântico para legibilidade.
type EmpEnrichedRow  = EmpRow;
type LiqEnrichedRow  = LiqRow;
type PgtoEnrichedRow = PgtoRow;
type CtrEnrichedRow  = CtrRow;

// ══════════════════════════════════════════════════════════════
//  Shape do estado
// ══════════════════════════════════════════════════════════════

export type DemonstrativoTipo =
  | "orgao"
  | "unidade"
  | "acao"
  | "elemento"
  | "programa"
  | "fonte"
  | "credor"
  | "numlicit"
  | "contrato"
  | "mensal";

export type ChartMode = "diario" | "mensal";

export interface FiltersSlice {
  visao: Visao;
  demonstrativo: DemonstrativoTipo;
  periodo: Periodo;
  // Filtros dropdown (selecionados pelos comboboxes)
  unidade: string;
  elemento: string;
  acao: string;
  contrato: string;
  credor: string;
  licit: string;
}

export interface DataSlice {
  loadedYears: Set<number>;
  enriched: {
    empenhos: EmpEnrichedRow[];
    liquidacoes: LiqEnrichedRow[];
    pagamentos: PgtoEnrichedRow[];
    receita: RecRow[];
    contratos: CtrEnrichedRow[];
  };
  painel: {
    emp: EmpRow[];          // sem RESTO A PAGAR
    liq: LiqRow[];
    pgto: PgtoRow[];
  };
  rap: {
    liq: LiqEnrichedRow[];
    pgto: PgtoEnrichedRow[];
    empBase: EmpEnrichedRow[] | null;
  };
  indexes: {
    empContratoMap: ContratoMap;
  };
  derived: {
    kpis: KpiResults | null;
    mensal: MensalResult | null;
    diario: DiarioResult | null;
    orgaos: GroupedRow[];
    unidades: GroupedRow[];
    acoes: GroupedRow[];
    elementos: GroupedRow[];
    programas: GroupedRow[];
    fontes: GroupedRow[];
    credores: GroupedRow[];
    numlicits: GroupedRow[];
    contratos: ContratoSummary[];
    currentEmp: EmpEnrichedRow[];
    currentLiq: LiqEnrichedRow[];
    currentPgto: PgtoEnrichedRow[];
  };
}

export interface ChartsSlice {
  barras: { mode: ChartMode; yMax: number | null };
  linha: { mode: ChartMode; yMax: number | null };
  active: "barras" | "linha";
}

export interface UiSlice {
  activeRoute: string | null;
  headerStatus: string;
  importing: boolean;
}

// ══════════════════════════════════════════════════════════════
//  Actions
// ══════════════════════════════════════════════════════════════

export interface StoreActions {
  // Filters
  setVisao: (v: Visao) => void;
  setDemonstrativo: (d: DemonstrativoTipo) => void;
  setPeriodo: (p: Periodo) => void;
  setFilter: (key: keyof Pick<FiltersSlice, "unidade" | "elemento" | "acao" | "contrato" | "credor" | "licit">, value: string) => void;

  // Data — escritas em transação batched
  appendEnriched: (rows: {
    emp: EmpEnrichedRow[];
    liq: LiqEnrichedRow[];
    pgto: PgtoEnrichedRow[];
    rec: RecRow[];
    ctr: CtrEnrichedRow[];
    painelEmp: EmpRow[];
    painelLiq: LiqRow[];
    painelPgto: PgtoRow[];
    rapLiq: LiqEnrichedRow[];
    rapPgto: PgtoEnrichedRow[];
  }) => void;
  setEmpContratoMap: (m: ContratoMap) => void;
  addLoadedYear: (year: number) => void;
  setRapEmpBase: (rows: EmpEnrichedRow[] | null) => void;
  setDerived: (derived: Partial<DataSlice["derived"]>) => void;
  resetData: () => void;

  // UI
  setActiveRoute: (route: string) => void;
  setHeaderStatus: (status: string) => void;
  setImporting: (importing: boolean) => void;

  // Charts
  setChartMode: (chart: "barras" | "linha", mode: ChartMode) => void;
  setChartYMax: (chart: "barras" | "linha", yMax: number | null) => void;
  setActiveChart: (chart: "barras" | "linha") => void;
}

// ══════════════════════════════════════════════════════════════
//  Initial state
// ══════════════════════════════════════════════════════════════

const initialPeriodo: Periodo = {
  mode: "todo",
  year: null,
  month: null,
  ini: null,
  fim: null,
};

const initialFilters: FiltersSlice = {
  visao: "todos",
  demonstrativo: "orgao",
  periodo: initialPeriodo,
  unidade: "",
  elemento: "",
  acao: "",
  contrato: "",
  credor: "",
  licit: "",
};

const initialData: DataSlice = {
  loadedYears: new Set<number>(),
  enriched: {
    empenhos: [],
    liquidacoes: [],
    pagamentos: [],
    receita: [],
    contratos: [],
  },
  painel: { emp: [], liq: [], pgto: [] },
  rap: { liq: [], pgto: [], empBase: null },
  indexes: { empContratoMap: new Map() },
  derived: {
    kpis: null,
    mensal: null,
    diario: null,
    orgaos: [],
    unidades: [],
    acoes: [],
    elementos: [],
    programas: [],
    fontes: [],
    credores: [],
    numlicits: [],
    contratos: [],
    currentEmp: [],
    currentLiq: [],
    currentPgto: [],
  },
};

const initialUi: UiSlice = {
  activeRoute: null,
  headerStatus: "",
  importing: false,
};

const initialCharts: ChartsSlice = {
  barras: { mode: "diario", yMax: null },
  linha: { mode: "diario", yMax: null },
  active: "barras",
};

// ══════════════════════════════════════════════════════════════
//  Store
// ══════════════════════════════════════════════════════════════

export interface AppStore extends StoreActions {
  filters: FiltersSlice;
  data: DataSlice;
  ui: UiSlice;
  charts: ChartsSlice;
}

export const useStore = create<AppStore>()(
  subscribeWithSelector((set) => ({
    filters: initialFilters,
    data: initialData,
    ui: initialUi,
    charts: initialCharts,

    // ── Filters actions ──
    setVisao: (v) =>
      set((s) => ({ filters: { ...s.filters, visao: v } })),
    setDemonstrativo: (d) =>
      set((s) => ({ filters: { ...s.filters, demonstrativo: d } })),
    setPeriodo: (p) =>
      set((s) => ({ filters: { ...s.filters, periodo: p } })),
    setFilter: (key, value) =>
      set((s) => ({ filters: { ...s.filters, [key]: value } })),

    // ── Data actions ──
    appendEnriched: (rows) =>
      set((s) => ({
        data: {
          ...s.data,
          enriched: {
            empenhos:    [...s.data.enriched.empenhos,    ...rows.emp],
            liquidacoes: [...s.data.enriched.liquidacoes, ...rows.liq],
            pagamentos:  [...s.data.enriched.pagamentos,  ...rows.pgto],
            receita:     [...s.data.enriched.receita,     ...rows.rec],
            contratos:   [...s.data.enriched.contratos,   ...rows.ctr],
          },
          painel: {
            emp:  [...s.data.painel.emp,  ...rows.painelEmp],
            liq:  [...s.data.painel.liq,  ...rows.painelLiq],
            pgto: [...s.data.painel.pgto, ...rows.painelPgto],
          },
          rap: {
            ...s.data.rap,
            liq:  [...s.data.rap.liq,  ...rows.rapLiq],
            pgto: [...s.data.rap.pgto, ...rows.rapPgto],
          },
        },
      })),
    setEmpContratoMap: (m) =>
      set((s) => ({
        data: { ...s.data, indexes: { ...s.data.indexes, empContratoMap: m } },
      })),
    addLoadedYear: (year) =>
      set((s) => ({
        data: {
          ...s.data,
          loadedYears: new Set([...s.data.loadedYears, year]),
        },
      })),
    setRapEmpBase: (rows) =>
      set((s) => ({
        data: { ...s.data, rap: { ...s.data.rap, empBase: rows } },
      })),
    setDerived: (derived) =>
      set((s) => ({
        data: { ...s.data, derived: { ...s.data.derived, ...derived } },
      })),
    resetData: () =>
      set(() => ({ data: { ...initialData, loadedYears: new Set() } })),

    // ── UI actions ──
    setActiveRoute: (route) =>
      set((s) => ({ ui: { ...s.ui, activeRoute: route } })),
    setHeaderStatus: (status) =>
      set((s) => ({ ui: { ...s.ui, headerStatus: status } })),
    setImporting: (importing) =>
      set((s) => ({ ui: { ...s.ui, importing } })),

    // ── Charts actions ──
    setChartMode: (chart, mode) =>
      set((s) => ({
        charts: { ...s.charts, [chart]: { ...s.charts[chart], mode } },
      })),
    setChartYMax: (chart, yMax) =>
      set((s) => ({
        charts: { ...s.charts, [chart]: { ...s.charts[chart], yMax } },
      })),
    setActiveChart: (chart) =>
      set((s) => ({ charts: { ...s.charts, active: chart } })),
  })),
);
