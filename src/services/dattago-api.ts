// dattago-api.ts — ponto de entrada da importação Vie Dattago.
//
// Port de assets/js/services/dattago-api.js (V3 — Service Layer).
// v25: Concorrência adaptativa por API (CONCURRENCY_HEAVY/LIGHT) + stagger entre workers.
//      Re-exporta todas as funções públicas para consumo pelos containers React.
//
// Arquivos individuais:
//   dattago-core.ts        — utilitários compartilhados (cache, parsers, HTTP, pool)
//   dattago-empenhos.ts    — getEmpenhos  (+ validação TotalRegistros + log)
//   dattago-liquidacoes.ts — getLiquidacoes  HEAVY: 3 workers, stagger 200ms
//   dattago-pagamentos.ts  — getPagamentos
//   dattago-receita.ts     — getReceita      HEAVY: 3 workers, stagger 200ms
//   dattago-contratos.ts   — getContratos    LIGHT: 5 workers

export { getEmpenhos }    from './dattago-empenhos';
export { getLiquidacoes } from './dattago-liquidacoes';
export { getPagamentos }  from './dattago-pagamentos';
export { getReceita }     from './dattago-receita';
export { getContratos }   from './dattago-contratos';
export { getImportDateRange } from './dattago-core';

import { hasValidCache, cacheKey } from './dattago-core';

export function clearDattagoCache(): void {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('despesaspmrv__dattago_')) localStorage.removeItem(key);
  }
}

export function isDattagoCached(year: number): boolean {
  return (
    hasValidCache(cacheKey('emp',  { year }))      &&
    hasValidCache(cacheKey('liq',  { year }))      &&
    hasValidCache(cacheKey('pgto', { ano: year })) &&
    hasValidCache(cacheKey('rec',  { ano: year })) &&
    hasValidCache(cacheKey('ctr',  { ano: year }))
  );
}
