// FiltersBar Dattago Moderno — 8 filtros em grid responsivo (7 cols xl, 4 lg, 2 mobile).
// Cada filtro = label+icon + filter-select que abre popover.
// Replica fiel do design (components.jsx FiltersBar).
//
// Cascade: opções de cada filtro derivadas dos rows filtrados upstream
// (skip o próprio filtro na hora de calcular opções).

import { useMemo, useState } from "react";
import {
  Calendar,
  Eye,
  Globe,
  Tag,
  Zap,
  FileText,
  UserRound,
  Scale,
  ChevronDown,
} from "lucide-react";
import { useStore } from "@/store";
import {
  CE,
  CL,
  getUnidades,
  filterByUnidade,
  filterByElemento,
  filterByAcao,
  filterByContrato,
} from "@/lib/compute";
import { MESES } from "@/lib/config";
import { MultiSelectPopover } from "@/components/multi-select-popover";
import { PeriodPopover } from "@/components/period-popover";
import type { Visao } from "@/lib/compute";

type FilterId =
  | "unidade"
  | "periodo"
  | "visao"
  | "elemento"
  | "acao"
  | "contrato"
  | "credor"
  | "licitacao";

type SimpleFilterKey = "unidade" | "elemento" | "acao" | "contrato" | "credor" | "licit";

const VISAO_OPTIONS: { value: Visao; label: string }[] = [
  { value: "todos",  label: "Todos" },
  { value: "pca",    label: "PCA" },
  { value: "folha",  label: "Folha" },
  { value: "outros", label: "Outros" },
  { value: "rap",    label: "Restos a Pagar" },
];

function uniqStrings<T extends ReadonlyArray<string | number | null>>(
  rows: readonly T[],
  colIdx: number,
): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    const v = String(r[colIdx] ?? "").trim();
    if (v) set.add(v);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function FilterBar() {
  const filters = useStore((s) => s.filters);
  const empRows = useStore((s) => s.data.painel.emp);
  const liqRows = useStore((s) => s.data.painel.liq);
  const pgtoRows = useStore((s) => s.data.painel.pgto);
  const empContratoMap = useStore((s) => s.data.indexes.empContratoMap);
  const setVisao = useStore((s) => s.setVisao);
  const setFilter = useStore((s) => s.setFilter);

  const [openId, setOpenId] = useState<FilterId | null>(null);

  // ── Cascade ──
  const unidades = useMemo(() => getUnidades(empRows), [empRows]);
  const afterUnidade = useMemo(
    () => filterByUnidade(empRows, liqRows, pgtoRows, filters.unidade),
    [empRows, liqRows, pgtoRows, filters.unidade],
  );
  const elementos = useMemo(() => uniqStrings(afterUnidade.empRows, CE.ELEMENTO), [afterUnidade.empRows]);
  const afterElemento = useMemo(
    () =>
      filterByElemento(
        afterUnidade.empRows,
        afterUnidade.liqRows,
        afterUnidade.pgtoRows,
        filters.elemento,
      ),
    [afterUnidade, filters.elemento],
  );
  const acoes = useMemo(() => uniqStrings(afterElemento.empRows, CE.ACAO), [afterElemento.empRows]);
  const afterAcao = useMemo(
    () =>
      filterByAcao(
        afterElemento.empRows,
        afterElemento.liqRows,
        afterElemento.pgtoRows,
        filters.acao,
      ),
    [afterElemento, filters.acao],
  );

  const contratos = useMemo(() => {
    const set = new Set<string>();
    for (const r of afterAcao.empRows) {
      const num = String(r[CE.NUM_EMP] ?? "").trim();
      const nc = empContratoMap.get(num) ?? "";
      for (const c of nc.split(", ").filter(Boolean)) set.add(c);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [afterAcao.empRows, empContratoMap]);

  const afterContrato = useMemo(
    () =>
      filterByContrato(
        afterAcao.empRows,
        afterAcao.liqRows,
        afterAcao.pgtoRows,
        filters.contrato,
        empContratoMap,
      ),
    [afterAcao, filters.contrato, empContratoMap],
  );

  const licits = useMemo(() => uniqStrings(afterContrato.empRows, CE.ID_LICIT), [afterContrato.empRows]);

  const credores = useMemo(() => {
    const empNumsAfterFilters = new Set(
      afterContrato.empRows.map((r) => String(r[CE.NUM_EMP] ?? "").trim()).filter(Boolean),
    );
    const set = new Set<string>();
    for (const r of afterContrato.liqRows) {
      const num = String(r[CL.NUM_EMP] ?? "").trim();
      if (!empNumsAfterFilters.has(num)) continue;
      const credor = String(r[CL.CREDOR] ?? "").trim();
      if (credor) set.add(credor);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [afterContrato]);

  // ── Period value display ──
  const periodoValue = useMemo(() => {
    const p = filters.periodo;
    switch (p.mode) {
      case "todo":   return "Todo o período";
      case "hoje":   return "Hoje";
      case "semana": return "Esta semana";
      case "mes":    return "Este mês";
      case "ano":    return `Ano ${p.year}`;
      case "mes-ano":
        return p.month && p.year ? `${MESES[p.month - 1]} / ${p.year}` : "Mês";
      case "range":  return "Personalizado";
    }
  }, [filters.periodo]);

  // ── Filter definitions ──
  const filterDefs: Array<{
    id: FilterId;
    icon: typeof Globe;
    label: string;
    value: string;
    options?: string[];
    valueKey?: SimpleFilterKey;
    isPeriod?: boolean;
    isVisao?: boolean;
  }> = [
    { id: "unidade",   icon: Globe,    label: "Unidade",   value: filters.unidade   || "Todas as unidades",   options: unidades,  valueKey: "unidade" },
    { id: "periodo",   icon: Calendar, label: "Período",   value: periodoValue,                                                                            isPeriod: true },
    { id: "visao",     icon: Eye,      label: "Visão",     value: VISAO_OPTIONS.find((v) => v.value === filters.visao)?.label ?? "Todos",                  isVisao: true },
    { id: "elemento",  icon: Tag,      label: "Elemento",  value: filters.elemento  || "Todos os elementos",   options: elementos, valueKey: "elemento" },
    { id: "acao",      icon: Zap,      label: "Ação",      value: filters.acao      || "Todas as ações",       options: acoes,     valueKey: "acao" },
    { id: "contrato",  icon: FileText, label: "Contrato",  value: filters.contrato  || "Todos os contratos",   options: contratos, valueKey: "contrato" },
    { id: "credor",    icon: UserRound,label: "Credor",    value: filters.credor    || "Todos os credores",    options: credores,  valueKey: "credor" },
    { id: "licitacao", icon: Scale,    label: "Licitação", value: filters.licit     || "Todas as licitações",  options: licits,    valueKey: "licit" },
  ];

  const hasData = empRows.length > 0;

  return (
    <div className="filters-grid">
      {filterDefs.map((f) => {
        const isOpen = openId === f.id;
        const Icon = f.icon;
        return (
          <div key={f.id} className="filter-field">
            <label className="filter-field-label">
              <Icon size={13} /> {f.label}
            </label>
            <div className="filter-anchor">
              <button
                type="button"
                className={`filter-select ${isOpen ? "is-open" : ""}`}
                disabled={!hasData && !f.isVisao && !f.isPeriod}
                onClick={() => setOpenId(isOpen ? null : f.id)}
              >
                {f.isPeriod && <Calendar size={14} />}
                <span className="filter-select-value">{f.value}</span>
                <ChevronDown size={14} className="filter-select-caret" />
              </button>

              {f.isPeriod && isOpen && <PeriodPopover onClose={() => setOpenId(null)} />}

              {f.isVisao && isOpen && (
                <div className="ms-pop" role="dialog" aria-label="Visão">
                  <div className="ms-list" style={{ maxHeight: "none", padding: 8 }}>
                    {VISAO_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        className={`ms-row ${filters.visao === opt.value ? "is-on" : ""}`}
                        onClick={() => {
                          setVisao(opt.value);
                          setOpenId(null);
                        }}
                      >
                        <span className="ms-check">
                          {filters.visao === opt.value && <span style={{ fontSize: 11 }}>✓</span>}
                        </span>
                        <span className="ms-label">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!f.isPeriod && !f.isVisao && f.valueKey && isOpen && (
                <MultiSelectPopover
                  options={f.options ?? []}
                  selected={
                    filters[f.valueKey]
                      ? [filters[f.valueKey] as string].filter(Boolean)
                      : []
                  }
                  onClose={() => setOpenId(null)}
                  onChange={(list) => {
                    // single-value semantics — pega o último selecionado, ou vazio
                    setFilter(f.valueKey as SimpleFilterKey, list[list.length - 1] ?? "");
                  }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
