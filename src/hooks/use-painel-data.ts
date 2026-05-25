import { useMemo } from "react";
import {
  buildPagoByDate,
  computeAllGrouped,
  computeByContrato,
  computeDiario,
  computeKpis,
  computeMensal,
  filterByVisao,
  filterByPeriodo,
  filterByElemento,
  filterByAcao,
  filterByContrato,
  filterByCredor,
  filterByLicit,
  filterByUnidade,
} from "@/lib/compute";
import { useStore } from "@/store";
import { useShallow } from "zustand/shallow";

/**
 * Hook que aplica os filtros do Painel e retorna os derivados computados.
 * Memoiza por filters + data.painel — recomputa só quando algo muda.
 */
export function usePainelData() {
  const { painel, indexes, filters } = useStore(
    useShallow((s) => ({
      painel: s.data.painel,
      indexes: s.data.indexes,
      filters: s.filters,
    })),
  );

  return useMemo(() => {
    // ── Pipeline: visao → periodo → unidade → elemento → ação → contrato → licit → credor ──
    let emp = painel.emp;
    let liq = painel.liq;
    let pgto = painel.pgto;

    // Visão RAP: filterByVisao legacy retorna o input. Implementação completa
    // (usar rap.liq/pgto explicitamente) fica como TODO — comportamento atual
    // equivale a "todos" pra essa visão.
    if (filters.visao !== "rap") {
      ({ empRows: emp, liqRows: liq, pgtoRows: pgto } = filterByVisao(emp, liq, pgto, filters.visao));
    }

    const periodo = filters.periodo;
    ({ empRows: emp, liqRows: liq, pgtoRows: pgto } = filterByPeriodo(emp, liq, pgto, periodo.ini, periodo.fim));
    ({ empRows: emp, liqRows: liq, pgtoRows: pgto } = filterByUnidade(emp, liq, pgto, filters.unidade));
    ({ empRows: emp, liqRows: liq, pgtoRows: pgto } = filterByElemento(emp, liq, pgto, filters.elemento));
    ({ empRows: emp, liqRows: liq, pgtoRows: pgto } = filterByAcao(emp, liq, pgto, filters.acao));
    ({ empRows: emp, liqRows: liq, pgtoRows: pgto } = filterByContrato(emp, liq, pgto, filters.contrato, indexes.empContratoMap));
    ({ empRows: emp, liqRows: liq, pgtoRows: pgto } = filterByLicit(emp, liq, pgto, filters.licit));
    ({ empRows: emp, liqRows: liq, pgtoRows: pgto } = filterByCredor(emp, liq, pgto, filters.credor));

    // ── Derivados ──
    const kpis = computeKpis(emp, liq, pgto);
    const pagoByDate = buildPagoByDate(liq, pgto);
    const mensal = computeMensal(emp, liq, pgto, pagoByDate);
    const diario = computeDiario(emp, liq, pgto, pagoByDate);
    const grouped = computeAllGrouped(emp, liq);
    const contratos = computeByContrato(emp, liq, indexes.empContratoMap);

    return {
      empRows: emp,
      liqRows: liq,
      pgtoRows: pgto,
      kpis,
      mensal,
      diario,
      ...grouped,
      contratos,
    };
  }, [painel, indexes, filters]);
}
