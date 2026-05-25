import { useCallback, useRef, useState } from "react";
import {
  getEmpenhos,
  getLiquidacoes,
  getPagamentos,
  getReceita,
  getContratos,
  isDattagoCached,
  clearDattagoCache,
} from "@/services/dattago-api";
import { CE, CL, CP } from "@/lib/compute";
import {
  enrichEmpWithContrato,
  enrichLiqRows,
  enrichPgtoRows,
  enrichCtrRows,
} from "@/lib/enrichment";
import { useStore } from "@/store";
import type {
  EmpRow,
  LiqRow,
  PgtoRow,
  RecRow,
  CtrRow,
  ContratoMap,
} from "@/lib/compute";

export interface ImportProgress {
  api: "emp" | "liq" | "pgto" | "rec" | "ctr";
  count: number;
  error?: boolean;
}

export interface ImportState {
  status: "idle" | "running" | "done" | "error";
  fromCache: boolean;
  totalRegistros: number;
  perApi: Record<string, number>;
  error: string | null;
}

const INITIAL: ImportState = {
  status: "idle",
  fromCache: false,
  totalRegistros: 0,
  perApi: { emp: 0, liq: 0, pgto: 0, rec: 0, ctr: 0 },
  error: null,
};

/**
 * Hook que orquestra a importação de um ano da API Dattago.
 * Faz fetch paralelo das 5 APIs, enrichment cruzado, e grava no store
 * via appendEnriched (1 transação Zustand para batching natural).
 */
export function useImportDattago() {
  const [state, setState] = useState<ImportState>(INITIAL);
  const runningRef = useRef(false);

  // Actions Zustand são referências estáveis — selecionar diretamente
  // não vira dep instável do useCallback.
  const appendEnriched = useStore((s) => s.appendEnriched);
  const setEmpContratoMap = useStore((s) => s.setEmpContratoMap);
  const addLoadedYear = useStore((s) => s.addLoadedYear);
  const setImporting = useStore((s) => s.setImporting);
  const setHeaderStatus = useStore((s) => s.setHeaderStatus);

  const run = useCallback(
    async (year: number) => {
      if (runningRef.current) return;
      // getState() = leitura síncrona sem subscribe — evita re-criar `run`
      // a cada addLoadedYear (que mudaria a referência do Set).
      if (useStore.getState().data.loadedYears.has(year)) return;
      runningRef.current = true;
      setImporting(true);
      setState({ ...INITIAL, status: "running" });
      setHeaderStatus(`Importando ${year}…`);

      try {
        const fromCache = isDattagoCached(year);
        if (fromCache) setState((s) => ({ ...s, fromCache: true }));

        // 5 APIs em paralelo (Promise.allSettled — falha de uma não bloqueia)
        const [empRes, liqRes, pgtoRes, recRes, ctrRes] = await Promise.allSettled([
          getEmpenhos(year),
          getLiquidacoes(year),
          getPagamentos(year),
          getReceita(year),
          getContratos(year),
        ]);

        const empRows  = empRes.status  === "fulfilled" ? (empRes.value.rows  as EmpRow[])  : [];
        const liqRows  = liqRes.status  === "fulfilled" ? (liqRes.value.rows  as LiqRow[])  : [];
        const pgtoRows = pgtoRes.status === "fulfilled" ? (pgtoRes.value.rows as PgtoRow[]) : [];
        const recRows  = recRes.status  === "fulfilled" ? (recRes.value.rows  as RecRow[])  : [];
        const ctrRows  = ctrRes.status  === "fulfilled" ? (ctrRes.value.rows  as CtrRow[])  : [];

        setState((s) => ({
          ...s,
          perApi: {
            emp:  empRows.length,
            liq:  liqRows.length,
            pgto: pgtoRows.length,
            rec:  recRows.length,
            ctr:  ctrRows.length,
          },
        }));

        // ── Enrichment cruzado ─────────────────────────────────
        const enrichedLiqRows  = enrichLiqRows(liqRows, empRows);
        const enrichedPgtoRows = enrichPgtoRows(pgtoRows, empRows);
        const enrichedCtrRows  = enrichCtrRows(ctrRows, empRows);
        const enrichedEmpRows  = enrichEmpWithContrato(empRows, ctrRows);

        // empContratoMap acumulado
        const contratoMap: ContratoMap = new Map();
        for (const r of enrichedEmpRows) {
          const num = String(r[CE.NUM_EMP] ?? "").trim();
          const nc = String(r[21] ?? "").trim();
          if (num && nc) contratoMap.set(num, nc);
        }

        // Separa RAP (Restos a Pagar) das linhas de painel
        const painelLiqRows  = enrichedLiqRows.filter(
          (r) => r[CL.TIPO] !== "RESTO A PAGAR",
        );
        const painelPgtoRows = enrichedPgtoRows.filter(
          (r) => r[CP.TIPO] !== "RESTO A PAGAR",
        );
        const rapLiqRows  = enrichedLiqRows.filter(
          (r) => r[CL.TIPO] === "RESTO A PAGAR",
        );
        const rapPgtoRows = enrichedPgtoRows.filter(
          (r) => r[CP.TIPO] === "RESTO A PAGAR",
        );

        // ── Grava no store em transação batched ────────────────
        appendEnriched({
          emp:  enrichedEmpRows,
          liq:  enrichedLiqRows,
          pgto: enrichedPgtoRows,
          rec:  recRows,
          ctr:  enrichedCtrRows,
          painelEmp:  empRows,            // emp do painel não exclui nada (não há RAP em emp)
          painelLiq:  painelLiqRows,
          painelPgto: painelPgtoRows,
          rapLiq:  rapLiqRows,
          rapPgto: rapPgtoRows,
        });
        setEmpContratoMap(contratoMap);
        addLoadedYear(year);

        const total =
          enrichedEmpRows.length +
          enrichedLiqRows.length +
          enrichedPgtoRows.length +
          recRows.length +
          enrichedCtrRows.length;

        setState((s) => ({
          ...s,
          status: "done",
          totalRegistros: total,
        }));
        setHeaderStatus(
          `Atualizado em ${new Date().toLocaleString("pt-BR")}`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        setState((s) => ({ ...s, status: "error", error: msg }));
        setHeaderStatus(`Erro: ${msg}`);
      } finally {
        setImporting(false);
        runningRef.current = false;
      }
    },
    [
      appendEnriched,
      setEmpContratoMap,
      addLoadedYear,
      setImporting,
      setHeaderStatus,
    ],
  );

  const reset = useCallback(() => {
    clearDattagoCache();
    useStore.getState().resetData();
    setState(INITIAL);
    setHeaderStatus("");
  }, [setHeaderStatus]);

  return { state, run, reset };
}
