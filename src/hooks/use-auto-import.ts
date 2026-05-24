import { useEffect, useRef } from "react";
import { useImportDattago } from "@/hooks/use-import-dattago";
import { useStore } from "@/store";

/**
 * Auto-importa o ano corrente no primeiro mount do app. Equivale ao
 * `buscarDadosDattago(new Date().getFullYear())` que o legacy disparava
 * em init(). Roda 1 vez por sessão (StrictMode-safe via useRef).
 */
export function useAutoImport() {
  const { run } = useImportDattago();
  const loadedYears = useStore((s) => s.data.loadedYears);
  const triggered = useRef(false);

  useEffect(() => {
    if (triggered.current) return;
    triggered.current = true;
    const currentYear = new Date().getFullYear();
    if (!loadedYears.has(currentYear)) {
      run(currentYear);
    }
  }, [run, loadedYears]);
}
