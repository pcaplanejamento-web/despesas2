// store/index.ts — Zustand store.
//
// Shape: 4 slices (filters, data, ui, charts).
// - `data.enriched.*` é o ground-truth pós-import (read via TablePage).
// - `data.painel.*` é o subset sem RESTO A PAGAR (consumido por usePainelData).
// - `data.rap.*` é só o subset RAP (futuro: visão RAP no Painel).
// - Derivados (KPIs, mensal, diário, grouped, etc.) são computados em
//   usePainelData via useMemo — NÃO ficam no store, pra evitar staleness.

import { create } from "zustand";
import type {
  CtrRow,
  EmpRow,
  LiqRow,
  PgtoRow,
  Periodo,
  RecRow,
  Visao,
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
  };
  indexes: {
    empContratoMap: ContratoMap;
  };
}

export interface ChartsSlice {
  barras: { mode: ChartMode };
  linha: { mode: ChartMode };
}

export interface UiSlice {
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
  resetData: () => void;

  // UI
  setHeaderStatus: (status: string) => void;
  setImporting: (importing: boolean) => void;

  // Charts
  setChartMode: (chart: "barras" | "linha", mode: ChartMode) => void;
}

// ══════════════════════════════════════════════════════════════
//  Initial state — factories evitam que mutações em initial
//  vazem para resetData (objetos compartilhados são frágeis)
// ══════════════════════════════════════════════════════════════

const initialPeriodo = (): Periodo => ({
  mode: "todo",
  year: null,
  month: null,
  ini: null,
  fim: null,
});

const initialFilters = (): FiltersSlice => ({
  visao: "todos",
  demonstrativo: "orgao",
  periodo: initialPeriodo(),
  unidade: "",
  elemento: "",
  acao: "",
  contrato: "",
  credor: "",
  licit: "",
});

const initialData = (): DataSlice => ({
  loadedYears: new Set<number>(),
  enriched: {
    empenhos: [],
    liquidacoes: [],
    pagamentos: [],
    receita: [],
    contratos: [],
  },
  painel: { emp: [], liq: [], pgto: [] },
  rap: { liq: [], pgto: [] },
  indexes: { empContratoMap: new Map() },
});

const initialUi = (): UiSlice => ({
  headerStatus: "",
  importing: false,
});

const initialCharts = (): ChartsSlice => ({
  barras: { mode: "diario" },
  linha: { mode: "diario" },
});

// ══════════════════════════════════════════════════════════════
//  Store
// ══════════════════════════════════════════════════════════════

export interface AppStore extends StoreActions {
  filters: FiltersSlice;
  data: DataSlice;
  ui: UiSlice;
  charts: ChartsSlice;
}

export const useStore = create<AppStore>()((set) => ({
  filters: initialFilters(),
  data: initialData(),
  ui: initialUi(),
  charts: initialCharts(),

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
  resetData: () => set(() => ({ data: initialData() })),

  // ── UI actions ──
  setHeaderStatus: (status) =>
    set((s) => ({ ui: { ...s.ui, headerStatus: status } })),
  setImporting: (importing) =>
    set((s) => ({ ui: { ...s.ui, importing } })),

  // ── Charts actions ──
  setChartMode: (chart, mode) =>
    set((s) => ({
      charts: { ...s.charts, [chart]: { ...s.charts[chart], mode } },
    })),
}));
