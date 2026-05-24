import { useMemo } from "react";
import { Calendar, Eye, Globe, Tag, Zap, FileBadge, Users, FileSearch } from "lucide-react";
import { useStore } from "@/store";
import { getUnidades } from "@/lib/compute";
import { MESES } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { Visao } from "@/lib/compute";

const VISAO_OPTIONS: { value: Visao; label: string }[] = [
  { value: "todos",  label: "Todos" },
  { value: "pca",    label: "PCA" },
  { value: "folha",  label: "Folha" },
  { value: "outros", label: "Outros" },
  { value: "rap",    label: "Restos a Pagar" },
];

const PERIODO_OPTIONS = [
  { mode: "todo",     label: "Todos" },
  { mode: "hoje",     label: "Hoje" },
  { mode: "semana",   label: "Semana" },
  { mode: "mes",      label: "Mês corrente" },
] as const;

const CURRENT_YEAR = new Date().getFullYear();

interface FilterSelectProps {
  label: string;
  icon: typeof Eye;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}

function FilterSelect({ label, icon: Icon, value, onChange, options, disabled }: FilterSelectProps) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "h-9 w-full rounded-md border bg-background px-3 text-sm shadow-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

/**
 * Filter bar — 7 controles. V9 implementa Visão + Período + Unidade
 * (selects nativos shadcn-style). Filtros restantes (Elemento, Ação,
 * Contrato, Credor, Licit) ficam como selects simples por enquanto;
 * podem virar Combobox com busca em onda futura.
 */
export function FilterBar() {
  const filters = useStore((s) => s.filters);
  const empRows = useStore((s) => s.data.painel.emp);
  const setVisao = useStore((s) => s.setVisao);
  const setPeriodo = useStore((s) => s.setPeriodo);
  const setFilter = useStore((s) => s.setFilter);

  const unidades = useMemo(() => getUnidades(empRows), [empRows]);

  // Período: serializa mode em string para o select
  const periodoValue = filters.periodo.mode === "mes-ano"
    ? `mes-ano:${filters.periodo.year ?? CURRENT_YEAR}-${filters.periodo.month ?? 1}`
    : filters.periodo.mode === "ano"
      ? `ano:${filters.periodo.year ?? CURRENT_YEAR}`
      : filters.periodo.mode;

  const onPeriodoChange = (v: string) => {
    if (v.startsWith("ano:")) {
      const year = Number(v.slice(4));
      setPeriodo({
        mode: "ano",
        year,
        month: null,
        ini: new Date(year, 0, 1),
        fim: new Date(year, 11, 31),
      });
    } else if (v.startsWith("mes-ano:")) {
      const [yStr, mStr] = v.slice(8).split("-");
      const year = Number(yStr), month = Number(mStr);
      setPeriodo({
        mode: "mes-ano",
        year,
        month,
        ini: new Date(year, month - 1, 1),
        fim: new Date(year, month, 0),
      });
    } else {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const mode = v as "todo" | "hoje" | "semana" | "mes";
      if (mode === "hoje") setPeriodo({ mode, year: null, month: null, ini: today, fim: today });
      else if (mode === "semana") {
        const sun = new Date(today); sun.setDate(today.getDate() - today.getDay());
        setPeriodo({ mode, year: null, month: null, ini: sun, fim: today });
      } else if (mode === "mes") {
        setPeriodo({
          mode,
          year: null, month: null,
          ini: new Date(today.getFullYear(), today.getMonth(), 1),
          fim: today,
        });
      } else {
        setPeriodo({ mode: "todo", year: null, month: null, ini: null, fim: null });
      }
    }
  };

  // Gera opções de período (presets + meses + anos)
  const periodoOptions: { value: string; label: string }[] = [
    ...PERIODO_OPTIONS.map((p) => ({ value: p.mode, label: p.label })),
    ...MESES.map((m, i) => ({
      value: `mes-ano:${CURRENT_YEAR}-${i + 1}`,
      label: `${m}/${CURRENT_YEAR}`,
    })),
    { value: `ano:${CURRENT_YEAR}`, label: `Ano ${CURRENT_YEAR}` },
    { value: `ano:${CURRENT_YEAR - 1}`, label: `Ano ${CURRENT_YEAR - 1}` },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      <FilterSelect
        label="Unidade"
        icon={Globe}
        value={filters.unidade}
        onChange={(v) => setFilter("unidade", v)}
        options={[
          { value: "", label: "Todas" },
          ...unidades.map((u) => ({ value: u, label: u })),
        ]}
        disabled={unidades.length === 0}
      />
      <FilterSelect
        label="Período"
        icon={Calendar}
        value={periodoValue}
        onChange={onPeriodoChange}
        options={periodoOptions}
      />
      <FilterSelect
        label="Visão"
        icon={Eye}
        value={filters.visao}
        onChange={(v) => setVisao(v as Visao)}
        options={VISAO_OPTIONS}
      />
      <FilterSelect
        label="Elemento"
        icon={Tag}
        value={filters.elemento}
        onChange={(v) => setFilter("elemento", v)}
        options={[{ value: "", label: "Todos" }]}
        disabled
      />
      <FilterSelect
        label="Ação"
        icon={Zap}
        value={filters.acao}
        onChange={(v) => setFilter("acao", v)}
        options={[{ value: "", label: "Todas" }]}
        disabled
      />
      <FilterSelect
        label="Credor"
        icon={Users}
        value={filters.credor}
        onChange={(v) => setFilter("credor", v)}
        options={[{ value: "", label: "Todos" }]}
        disabled
      />
      <FilterSelect
        label="Licitação"
        icon={FileSearch}
        value={filters.licit}
        onChange={(v) => setFilter("licit", v)}
        options={[{ value: "", label: "Todas" }]}
        disabled
      />
    </div>
  );
}

// Imports não usados (eslint placate) — reservados para próxima onda quando
// Elemento/Ação/Credor/Licit ganharem comboboxes com search.
void FileBadge;
