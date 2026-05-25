// MultiSelectPopover Dattago Moderno — search + checkboxes + sort buttons + apply.
// Replica fiel do design (components.jsx MultiSelectPopover).

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Check, ArrowUp, ArrowDown } from "lucide-react";

type SortDir = "asc" | "desc" | null;

interface MultiSelectPopoverProps {
  options: readonly string[];
  selected: readonly string[];
  /** Texto da opção "Todos" (não exibido como item, só usado em valueFor pelo parent). */
  allLabel?: string;
  /** Trigger ao clicar fora ou Escape. */
  onClose: () => void;
  /** Trigger quando user clica "Aplicar". */
  onChange: (next: string[]) => void;
  /** Habilita botões de sort (asc/desc) no footer. */
  onSortAsc?: () => void;
  onSortDesc?: () => void;
  sortDir?: SortDir;
}

export function MultiSelectPopover({
  options,
  selected,
  onClose,
  onChange,
  onSortAsc,
  onSortDesc,
  sortDir,
}: MultiSelectPopoverProps) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set(selected));
  const ref = useRef<HTMLDivElement>(null);
  const hasSort = Boolean(onSortAsc || onSortDesc);

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

  const filtered = useMemo(() => {
    if (!q) return options;
    const qLower = q.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(qLower));
  }, [q, options]);

  const toggle = (o: string) => {
    const next = new Set(sel);
    if (next.has(o)) next.delete(o);
    else next.add(o);
    setSel(next);
  };

  const selectAll = () => setSel(new Set(filtered));
  const clearAll = () => setSel(new Set());
  const apply = () => {
    onChange([...sel]);
    onClose();
  };

  return (
    <div className="ms-pop" ref={ref}>
      <div className="ms-search">
        <Search size={14} />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar…"
        />
        {q && (
          <button className="ms-clear-input" onClick={() => setQ("")} aria-label="Limpar busca">
            ×
          </button>
        )}
      </div>

      <div className="ms-actions">
        <button className="ms-link" onClick={selectAll}>
          Selecionar todos ({filtered.length})
        </button>
        <button className="ms-link" onClick={clearAll}>
          Limpar ({sel.size})
        </button>
      </div>

      <div className="ms-list">
        {filtered.length === 0 && (
          <div className="ms-empty">Nenhum resultado para &quot;{q}&quot;</div>
        )}
        {filtered.map((o) => {
          const isOn = sel.has(o);
          return (
            <button
              key={o}
              className={`ms-row ${isOn ? "is-on" : ""}`}
              onClick={() => toggle(o)}
            >
              <span className="ms-check">
                {isOn && <Check size={11} strokeWidth={3} />}
              </span>
              <span className="ms-label">{o}</span>
            </button>
          );
        })}
      </div>

      <div className="ms-foot">
        {hasSort && (
          <div className="ms-sort-row">
            <button
              className={`ms-sort-btn ${sortDir === "asc" ? "is-active" : ""}`}
              title="Crescente"
              onClick={() => onSortAsc?.()}
              aria-label="Ordenar crescente"
            >
              <ArrowUp size={12} />
            </button>
            <button
              className={`ms-sort-btn ${sortDir === "desc" ? "is-active" : ""}`}
              title="Decrescente"
              onClick={() => onSortDesc?.()}
              aria-label="Ordenar decrescente"
            >
              <ArrowDown size={12} />
            </button>
          </div>
        )}
        <button className="ms-btn-primary" onClick={apply}>
          Aplicar
        </button>
      </div>
    </div>
  );
}
