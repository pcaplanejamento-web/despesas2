import { useMemo } from "react";
import { Calendar, Eye, Globe, Tag, Zap, FileBadge, Users, FileSearch } from "lucide-react";
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
import { FilterCombobox } from "@/components/filter-combobox";
import { NativeSelect } from "@/components/ui/native-select";
import type { Visao } from "@/lib/compute";

const VISAO_OPTIONS: { value: Visao; label: string }[] = [
  { value: "todos",  label: "Todos" },
  { value: "pca",    label: "PCA" },
  { value: "folha",  label: "Folha" },
  { value: "outros", label: "Outros" },
  { value: "rap",    label: "Restos a Pagar" },
];

const PERIODO_PRESETS = [
  { mode: "todo",   label: "Todos" },
  { mode: "hoje",   label: "Hoje" },
  { mode: "semana", label: "Semana" },
  { mode: "mes",    label: "Mês corrente" },
] as const;

const CURRENT_YEAR = new Date().getFullYear();

interface LabeledNativeSelectProps {
  label: string;
  icon: typeof Eye;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}

/** Wrapper local: label+icon em cima de um NativeSelect compartilhado. */
function LabeledNativeSelect({
  label,
  icon: Icon,
  value,
  onChange,
  options,
  disabled,
}: LabeledNativeSelectProps) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </label>
      <NativeSelect value={value} onChange={onChange} options={options} disabled={disabled} />
    </div>
  );
}

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

/**
 * Filter bar — 8 controles em grid responsivo.
 * Cascade: options de cada filtro são derivadas dos rows JÁ filtrados
 * pelos filtros upstream (skip o próprio na hora de calcular options).
 */
export function FilterBar() {
  const filters = useStore((s) => s.filters);
  const empRows = useStore((s) => s.data.painel.emp);
  const liqRows = useStore((s) => s.data.painel.liq);
  const pgtoRows = useStore((s) => s.data.painel.pgto);
  const empContratoMap = useStore((s) => s.data.indexes.empContratoMap);
  const setVisao = useStore((s) => s.setVisao);
  const setPeriodo = useStore((s) => s.setPeriodo);
  const setFilter = useStore((s) => s.setFilter);

  // ── Cascade options ──
  const unidades = useMemo(() => getUnidades(empRows), [empRows]);

  const afterUnidade = useMemo(
    () => filterByUnidade(empRows, liqRows, pgtoRows, filters.unidade),
    [empRows, liqRows, pgtoRows, filters.unidade],
  );

  const elementos = useMemo(
    () => uniqStrings(afterUnidade.empRows, CE.ELEMENTO),
    [afterUnidade.empRows],
  );

  const afterElemento = useMemo(
    () => filterByElemento(
      afterUnidade.empRows,
      afterUnidade.liqRows,
      afterUnidade.pgtoRows,
      filters.elemento,
    ),
    [afterUnidade, filters.elemento],
  );

  const acoes = useMemo(
    () => uniqStrings(afterElemento.empRows, CE.ACAO),
    [afterElemento.empRows],
  );

  const afterAcao = useMemo(
    () => filterByAcao(
      afterElemento.empRows,
      afterElemento.liqRows,
      afterElemento.pgtoRows,
      filters.acao,
    ),
    [afterElemento, filters.acao],
  );

  // Contratos vêm do empContratoMap, filtrados pelos empenhos que sobraram
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
    () => filterByContrato(
      afterAcao.empRows,
      afterAcao.liqRows,
      afterAcao.pgtoRows,
      filters.contrato,
      empContratoMap,
    ),
    [afterAcao, filters.contrato, empContratoMap],
  );

  const licits = useMemo(
    () => uniqStrings(afterContrato.empRows, CE.ID_LICIT),
    [afterContrato.empRows],
  );

  const credores = useMemo(() => {
    const empNumsAfterFilters = new Set(
      afterContrato.empRows
        .map((r) => String(r[CE.NUM_EMP] ?? "").trim())
        .filter(Boolean),
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

  // ── Período ──
  const periodoValue = filters.periodo.mode === "mes-ano"
    ? `mes-ano:${filters.periodo.year ?? CURRENT_YEAR}-${filters.periodo.month ?? 1}`
    : filters.periodo.mode === "ano"
      ? `ano:${filters.periodo.year ?? CURRENT_YEAR}`
      : filters.periodo.mode;

  const onPeriodoChange = (v: string) => {
    if (v.startsWith("ano:")) {
      const year = Number(v.slice(4));
      setPeriodo({ mode: "ano", year, month: null, ini: new Date(year, 0, 1), fim: new Date(year, 11, 31) });
    } else if (v.startsWith("mes-ano:")) {
      const [yStr, mStr] = v.slice(8).split("-");
      const year = Number(yStr), month = Number(mStr);
      setPeriodo({ mode: "mes-ano", year, month, ini: new Date(year, month - 1, 1), fim: new Date(year, month, 0) });
    } else {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const mode = v as "todo" | "hoje" | "semana" | "mes";
      if (mode === "hoje") setPeriodo({ mode, year: null, month: null, ini: today, fim: today });
      else if (mode === "semana") {
        const sun = new Date(today); sun.setDate(today.getDate() - today.getDay());
        setPeriodo({ mode, year: null, month: null, ini: sun, fim: today });
      } else if (mode === "mes") {
        setPeriodo({ mode, year: null, month: null, ini: new Date(today.getFullYear(), today.getMonth(), 1), fim: today });
      } else {
        setPeriodo({ mode: "todo", year: null, month: null, ini: null, fim: null });
      }
    }
  };

  const periodoOptions: { value: string; label: string }[] = [
    ...PERIODO_PRESETS.map((p) => ({ value: p.mode, label: p.label })),
    ...MESES.map((m, i) => ({
      value: `mes-ano:${CURRENT_YEAR}-${i + 1}`,
      label: `${m}/${CURRENT_YEAR}`,
    })),
    { value: `ano:${CURRENT_YEAR}`,     label: `Ano ${CURRENT_YEAR}` },
    { value: `ano:${CURRENT_YEAR - 1}`, label: `Ano ${CURRENT_YEAR - 1}` },
  ];

  const hasData = empRows.length > 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
      <FilterCombobox
        label="Unidade"
        icon={Globe}
        value={filters.unidade}
        onChange={(v) => setFilter("unidade", v)}
        options={unidades}
        allLabel="Todas as Unidades"
        disabled={!hasData}
      />
      <LabeledNativeSelect
        label="Período"
        icon={Calendar}
        value={periodoValue}
        onChange={onPeriodoChange}
        options={periodoOptions}
      />
      <LabeledNativeSelect
        label="Visão"
        icon={Eye}
        value={filters.visao}
        onChange={(v) => setVisao(v as Visao)}
        options={VISAO_OPTIONS}
      />
      <FilterCombobox
        label="Elemento"
        icon={Tag}
        value={filters.elemento}
        onChange={(v) => setFilter("elemento", v)}
        options={elementos}
        allLabel="Todos os Elementos"
        disabled={!hasData}
      />
      <FilterCombobox
        label="Ação"
        icon={Zap}
        value={filters.acao}
        onChange={(v) => setFilter("acao", v)}
        options={acoes}
        allLabel="Todas as Ações"
        disabled={!hasData}
      />
      <FilterCombobox
        label="Contrato"
        icon={FileBadge}
        value={filters.contrato}
        onChange={(v) => setFilter("contrato", v)}
        options={contratos}
        allLabel="Todos os Contratos"
        disabled={!hasData}
      />
      <FilterCombobox
        label="Credor"
        icon={Users}
        value={filters.credor}
        onChange={(v) => setFilter("credor", v)}
        options={credores}
        allLabel="Todos os Credores"
        disabled={!hasData}
      />
      <FilterCombobox
        label="Licitação"
        icon={FileSearch}
        value={filters.licit}
        onChange={(v) => setFilter("licit", v)}
        options={licits}
        allLabel="Todas as Licitações"
        disabled={!hasData}
      />
    </div>
  );
}
