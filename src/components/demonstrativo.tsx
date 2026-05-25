// Demonstrativo Dattago Moderno — agregado por dimensão com barras de distribuição.
// Replica fiel do design (components.jsx Demonstrativo).
//
// Cada linha mostra: rank + nome, barra (3 sobrepostas emp/liq/pag), valores
// monetários, % execução, contagem de empenhos.

import { useMemo, useState } from "react";
import { ChevronDown, Search, Download } from "lucide-react";
import { useStore } from "@/store";
import { formatCurrency } from "@/lib/config";
import type { DemonstrativoTipo } from "@/store";
import type { GroupedRow } from "@/lib/compute";

const DEMO_LABELS: Record<DemonstrativoTipo, string> = {
  orgao:    "Por órgão",
  unidade:  "Por unidade",
  acao:     "Por ação",
  elemento: "Por elemento",
  programa: "Por programa",
  fonte:    "Por fonte",
  credor:   "Por credor",
  numlicit: "Por licitação",
  contrato: "Por contrato",
  mensal:   "Por mês",
};

const ROW_HEAD_BY_DIM: Record<DemonstrativoTipo, string> = {
  orgao:    "Órgão",
  unidade:  "Unidade Orçamentária",
  acao:     "Ação",
  elemento: "Elemento",
  programa: "Programa",
  fonte:    "Fonte de Recurso",
  credor:   "Credor",
  numlicit: "N. Licitação",
  contrato: "Contrato",
  mensal:   "Mês",
};

interface DemonstrativoProps {
  /** Dataset de linhas agregadas (vem de usePainelData). */
  rows: readonly GroupedRow[];
  /** Quantidade de empenhos por linha (opcional — calcula se não passar). */
  countByLabel?: Record<string, number>;
  /** Click handler ao clicar numa linha (abre drawer com filtro aplicado). */
  onRowClick?: (row: GroupedRow) => void;
  /** Loading state. */
  loading?: boolean;
}

const DIM_OPTIONS = Object.keys(DEMO_LABELS) as DemonstrativoTipo[];

export function Demonstrativo({ rows, countByLabel, onRowClick, loading }: DemonstrativoProps) {
  const demonstrativo = useStore((s) => s.filters.demonstrativo);
  const setDemonstrativo = useStore((s) => s.setDemonstrativo);
  const [q, setQ] = useState("");

  // Resolve qual key contém o "nome" da linha (depende da dimensão)
  const nameKey = demonstrativo as keyof GroupedRow;

  const filtered = useMemo(() => {
    if (!q) return rows;
    const qL = q.toLowerCase();
    return rows.filter((r) => String(r[nameKey] ?? "").toLowerCase().includes(qL));
  }, [rows, q, nameKey]);

  const maxEmpenhado = useMemo(
    () => filtered.reduce((m, r) => Math.max(m, r.empenhado), 1),
    [filtered],
  );

  const handleExport = () => {
    const headers = ["Nome", "Empenhado", "Liquidado", "Pago", "%", "Qtd"];
    const lines = [headers.join(",")];
    for (const r of filtered) {
      const name = String(r[nameKey] ?? "");
      const count = countByLabel?.[name] ?? 0;
      const pct = r.empenhado > 0 ? (r.pago / r.empenhado) * 100 : 0;
      lines.push(
        [
          `"${name.replace(/"/g, '""')}"`,
          r.empenhado.toFixed(2),
          r.liquidado.toFixed(2),
          r.pago.toFixed(2),
          pct.toFixed(1),
          count,
        ].join(","),
      );
    }
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `demonstrativo-${demonstrativo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="chart-card">
      <div className="chart-head">
        <div>
          <div className="chart-title">Demonstrativo</div>
          <div className="chart-sub">Agregado por dimensão — clique para detalhar</div>
        </div>
        <div className="chart-controls">
          <div className="filter-select filter-select-sm">
            <span className="filter-select-value">{DEMO_LABELS[demonstrativo]}</span>
            <select
              className="select-overlay"
              value={demonstrativo}
              onChange={(e) => setDemonstrativo(e.target.value as DemonstrativoTipo)}
              aria-label="Dimensão"
            >
              {DIM_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {DEMO_LABELS[d]}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </div>
          <div className="demo-search demo-search-inline">
            <Search size={13} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar…"
            />
          </div>
          <button
            type="button"
            className="icon-btn-sm"
            title="Exportar CSV"
            onClick={handleExport}
            aria-label="Exportar CSV"
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      <div className="demo-table">
        <div className="demo-row demo-row-head">
          <div className="demo-col-name">{ROW_HEAD_BY_DIM[demonstrativo]}</div>
          <div className="demo-col-bar">Distribuição</div>
          <div className="demo-col-num">Empenhado</div>
          <div className="demo-col-num">Liquidado</div>
          <div className="demo-col-num">Pago</div>
          <div className="demo-col-pct">% Exec.</div>
          <div className="demo-col-count">Emp.</div>
        </div>

        {loading && (
          <div style={{ padding: "32px 0", textAlign: "center", color: "var(--text-muted)" }}>
            Carregando…
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)" }}>
            {q ? `Nenhum resultado para "${q}"` : "Sem dados no período"}
          </div>
        )}

        {!loading &&
          filtered.map((r, i) => {
            const name = String(r[nameKey] ?? "—");
            const count = countByLabel?.[name] ?? 0;
            const pct = r.empenhado > 0 ? (r.pago / r.empenhado) * 100 : 0;
            const barW = (r.empenhado / maxEmpenhado) * 100;
            const liqW = r.empenhado > 0 ? (r.liquidado / r.empenhado) * barW : 0;
            const pagoW = r.empenhado > 0 ? (r.pago / r.empenhado) * barW : 0;
            return (
              <button
                key={`${name}-${i}`}
                type="button"
                className="demo-row"
                onClick={() => onRowClick?.(r)}
                style={{ all: "unset", display: "grid", cursor: onRowClick ? "pointer" : "default" }}
              >
                <div className="demo-col-name">
                  <span className="demo-rank mono">{String(i + 1).padStart(2, "0")}</span>
                  {name}
                </div>
                <div className="demo-col-bar">
                  <div className="demo-bar-track">
                    <div className="demo-bar demo-bar-emp" style={{ width: `${barW}%` }} />
                    <div className="demo-bar demo-bar-liq" style={{ width: `${liqW}%` }} />
                    <div className="demo-bar demo-bar-pag" style={{ width: `${pagoW}%` }} />
                  </div>
                </div>
                <div className="demo-col-num mono">{formatCurrency(r.empenhado)}</div>
                <div className="demo-col-num mono">{formatCurrency(r.liquidado)}</div>
                <div className="demo-col-num mono">{formatCurrency(r.pago)}</div>
                <div className="demo-col-pct mono">{pct.toFixed(1)}%</div>
                <div className="demo-col-count mono">{count.toLocaleString("pt-BR")}</div>
              </button>
            );
          })}
      </div>
    </div>
  );
}
