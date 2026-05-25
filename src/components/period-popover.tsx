// PeriodPopover Dattago Moderno — quicks + ano + meses + range custom.
// Replica fiel do design (components.jsx PeriodPopover).

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/store";
import { MESES } from "@/lib/config";
import type { Periodo, PeriodoMode } from "@/lib/compute";

const QUICKS: { label: string; mode: PeriodoMode }[] = [
  { label: "Todo o período", mode: "todo" },
  { label: "Hoje",           mode: "hoje" },
  { label: "Esta semana",    mode: "semana" },
  { label: "Este mês",       mode: "mes" },
];

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const CURRENT_YEAR = new Date().getFullYear();

interface PeriodPopoverProps {
  onClose: () => void;
}

export function PeriodPopover({ onClose }: PeriodPopoverProps) {
  const periodo = useStore((s) => s.filters.periodo);
  const setPeriodo = useStore((s) => s.setPeriodo);
  const ref = useRef<HTMLDivElement>(null);
  const [yearInput, setYearInput] = useState(String(periodo.year ?? CURRENT_YEAR));

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const t = setTimeout(() => document.addEventListener("mousedown", onDoc), 0);
    document.addEventListener("keydown", onEsc);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [onClose]);

  const setQuick = (mode: PeriodoMode) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let next: Periodo;
    if (mode === "hoje") {
      next = { mode, year: null, month: null, ini: today, fim: today };
    } else if (mode === "semana") {
      const sun = new Date(today);
      sun.setDate(today.getDate() - today.getDay());
      next = { mode, year: null, month: null, ini: sun, fim: today };
    } else if (mode === "mes") {
      next = {
        mode,
        year: null,
        month: null,
        ini: new Date(today.getFullYear(), today.getMonth(), 1),
        fim: today,
      };
    } else {
      next = { mode: "todo", year: null, month: null, ini: null, fim: null };
    }
    setPeriodo(next);
  };

  const setYear = (yearStr: string) => {
    const y = Number(yearStr);
    if (!Number.isFinite(y) || y < 2000 || y > 2100) return;
    setPeriodo({
      mode: "ano",
      year: y,
      month: null,
      ini: new Date(y, 0, 1),
      fim: new Date(y, 11, 31),
    });
  };

  const setMonth = (month: number) => {
    const y = Number(yearInput) || CURRENT_YEAR;
    setPeriodo({
      mode: "mes-ano",
      year: y,
      month: month + 1,
      ini: new Date(y, month, 1),
      fim: new Date(y, month + 1, 0),
    });
  };

  return (
    <div className="period-pop" ref={ref}>
      {/* Quicks */}
      <div className="period-quicks">
        {QUICKS.map((q) => (
          <button
            key={q.mode}
            className={`period-chip ${periodo.mode === q.mode ? "is-active" : ""}`}
            onClick={() => setQuick(q.mode)}
          >
            {q.label}
          </button>
        ))}
      </div>

      <div className="period-section-label">Ano</div>
      <div className="period-year-row">
        <input
          className="period-year-input mono"
          value={yearInput}
          onChange={(e) => setYearInput(e.target.value)}
          inputMode="numeric"
          maxLength={4}
        />
        <button className="period-filter-btn" onClick={() => setYear(yearInput)}>
          Filtrar ano
        </button>
      </div>

      <div className="period-section-label">Mês de {yearInput}</div>
      <div className="period-months">
        {MESES_ABREV.map((m, i) => (
          <button
            key={m}
            className={`period-chip ${
              periodo.mode === "mes-ano" &&
              periodo.month === i + 1 &&
              periodo.year === Number(yearInput)
                ? "is-active"
                : ""
            }`}
            onClick={() => setMonth(i)}
            title={MESES[i]}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}
