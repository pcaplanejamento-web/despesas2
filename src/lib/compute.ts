// compute.ts — agregacao client-side a partir das linhas brutas das APIs Vie Dattago
// v18: filterByLicit + filterByCredor — filtros de Licitação e Credor.
// Port de assets/js/core/compute.js (V2 — business logic puro).

// ── Tipos das linhas brutas (tuples — uma posição = uma coluna) ────────────────
//
// As linhas das APIs Vie Dattago são arrays heterogêneos onde cada índice
// corresponde a uma coluna conhecida. Mantemos como tuples genéricos para
// preservar a flexibilidade do JS original.

export type EmpRow  = ReadonlyArray<string | number | null>;
export type LiqRow  = ReadonlyArray<string | number | null>;
export type PgtoRow = ReadonlyArray<string | number | null>;
export type RecRow  = ReadonlyArray<string | number | null>;
export type CtrRow  = ReadonlyArray<string | number | null>;

/** Modo do filtro de período aplicado pelo painel. */
export type PeriodoMode = 'todo' | 'hoje' | 'semana' | 'mes' | 'ano' | 'mes-ano' | 'range';

/** Filtro de período parseado para o formato interno. */
export interface Periodo {
  mode:  PeriodoMode;
  year:  number | null;
  month: number | null;
  ini:   Date | null;
  fim:   Date | null;
}

/** Modos de visão (PCA / Folha / Outros / RAP) — `filterByVisao` em filters.ts. */
export type Visao = 'todos' | 'pca' | 'folha' | 'outros' | 'rap';

// ── Índices das colunas retornadas por mapEmpenho (0-based) ────────────────────

export const CE = {
  DATA:       0,  // Data (dd/mm/yyyy)
  ORGAO:      1,  // Orgao
  UNIDADE:    2,  // UnidadeOrcamentaria
  FORNECEDOR: 3,  // Fornecedor
  CPF_CNPJ:   4,  // CpfCnpj
  NUM_EMP:    5,  // Numero (chave do empenho)
  MODALIDADE: 6,  // Modalidade
  ID_LICIT:   7,  // IdLicit
  FUNCAO:     8,  // Funcao
  SUBFUNCAO:  9,  // SubFuncao
  PROGRAMA:   10, // Programa
  ACAO:       11, // Acao
  ELEMENTO:   12, // Elemento
  SUBELEMENTO:13, // SubElemento
  FONTE:      14, // FonteRecurso
  VL_EMP:     15, // VlEmpenhado
  VL_ANUL:    16, // VlAnulacao
  VL_LIQ:     17, // VlLiquidado
  VL_PAGO:    18, // VlPago
  SALDO:      19, // SaldoPagar
  HISTORICO:  20, // Historico
  ID:         21, // Id numérico do empenho (join fallback para pagamentos via CP.ID_EMP)
} as const;

// ── Índices das colunas retornadas por mapLiquidacao (0-based) ─────────────────

export const CL = {
  DATA_LIQ:   0,  // DataLiquidacao
  ORGAO:      1,  // Orgao
  CREDOR:     2,  // Credor
  CPF_CNPJ:   3,  // CpfCnpj
  NUM_LIQ:    4,  // NumeroLiquidacao
  NUM_EMP:    5,  // NumeroEmpenho (chave de join com CE.NUM_EMP)
  VALOR:      6,  // Valor (VlEmpenhado na liquidacao)
  VL_ANUL:    7,  // VlAnulacao
  VL_LIQUIDO: 8,  // VlLiquido
  VL_PAGO:    9,  // VlPago
  SALDO:      10, // Saldo
  HISTORICO:  11, // Historico
  TIPO:       12, // Tipo (enriquecido) — RESTO A PAGAR | NOTA DE EMPENHO | ERRO
} as const;

// ── Índices das colunas retornadas por mapPagamento (0-based) ──────────────────

export const CP = {
  DATA_PGTO:  0,  // DataOrdemPagamento
  ORGAO:      1,  // Orgao
  CREDOR:     2,  // NomeCredor
  CPF_CNPJ:   3,  // CpfCnpj
  ID_OP:      4,  // IdOP
  ID_EMP:     5,  // IdNotaEmpenho (numerico)
  VL_DOC:     6,  // VlDocumento
  VL_RET:     7,  // VlRetencao
  VL_LIQUIDO: 8,  // VlLiquido
  ANULADO:    9,  // Anulado
  MOTIVO:     10, // Motivo
  HISTORICO:  11, // Historico
  NUM_EMP:    12, // NumeroEmpenho (string) — chave de join com CE.NUM_EMP
  TIPO:       13, // Tipo (enriquecido) — RESTO A PAGAR | NOTA DE EMPENHO | ERRO
} as const;

// ── Tipos auxiliares (resultados de funções) ───────────────────────────────────

export interface FilteredTriple {
  empRows:  EmpRow[];
  liqRows:  LiqRow[];
  pgtoRows: PgtoRow[];
}

export interface KpiResults {
  empenhado:      number;
  liquidado:      number;
  anulado:        number;
  retido:         number;
  pagoLiquido:    number;
  pago:           number;
  pctLiquidado:   number;
  pctPago:        number;
  qtdEmpenhos:    number;
  qtdLiquidacoes: number;
  qtdPagamentos:  number;
  qtdAnulados:    number;
  qtdRetidos:     number;
}

export interface ContratoSummary {
  contrato:    string;
  empenhado:   number;
  liquidado:   number;
  anulado:     number;
  retido:      number;
  pago:        number;
  pagoLiquido: number;
}

/** Agregação por dimensão (1 entrada por chave, com a chave gravada na propriedade dinâmica). */
export interface GroupedRow {
  empenhado:   number;
  liquidado:   number;
  pago:        number;
  anulado:     number;
  retido:      number;
  pagoLiquido: number;
  // Propriedade dinâmica: 'orgao' | 'unidade' | 'acao' | 'elemento' | 'programa' | 'fonte' | 'credor' | 'numlicit'
  [key: string]: string | number;
}

export interface ComputeAllGroupedResult {
  orgaos:    GroupedRow[];
  unidades:  GroupedRow[];
  acoes:     GroupedRow[];
  elementos: GroupedRow[];
  programas: GroupedRow[];
  fontes:    GroupedRow[];
  credores:  GroupedRow[];
  numlicits: GroupedRow[];
}

export interface DiarioSimples {
  data:        string;
  date:        Date;
  empenhado:   number;
  liquidado:   number;
  anulado:     number;
  retido:      number;
  pagoLiquido: number;
  pago:        number;
}

export interface DiarioAcumulado extends DiarioSimples {
  empAcum:  number;
  liqAcum:  number;
  pagoAcum: number;
}

export interface DiarioResult {
  simples:   DiarioSimples[];
  acumulado: DiarioAcumulado[];
}

export interface MensalSimples {
  mes:         number;
  empenhado:   number;
  liquidado:   number;
  anulado:     number;
  retido:      number;
  pagoLiquido: number;
  pago:        number;
}

export interface MensalAcumulado {
  mes:      number;
  empAcum:  number;
  liqAcum:  number;
  pagoAcum: number;
}

export interface MensalPercentual {
  mes:          number;
  empenhado:    number;
  liquidado:    number;
  anulado:      number;
  retido:       number;
  pago:         number;
  empAcum:      number;
  liqAcum:      number;
  pagoAcum:     number;
  pctEmpenhado: number;
  pctLiquidado: number;
  pctPago:      number;
}

export interface MensalResult {
  simples:    MensalSimples[];
  acumulado:  MensalAcumulado[];
  percentual: MensalPercentual[];
}

/** Mapa público: número de empenho (string) → lista de contratos joinado (vírgula-separados). */
export type ContratoMap = Map<string, string>;

/** Mapa interno NUM_EMP → soma agregada. */
type NumericMap = Record<string, number>;

interface LiqEntry { valor: number; pago: number; anulado: number }
type EntryMap = Record<string, LiqEntry>;

// ── Helpers ────────────────────────────────────────────────────────────────────

export function parseDDMMYYYY(str: unknown): Date | null {
  if (!str) return null;
  const p = String(str).split('/');
  if (p.length !== 3) return null;
  const d = new Date(+p[2], +p[1] - 1, +p[0]);
  return isNaN(d.getTime()) ? null : d;
}

function n(v: unknown): number {
  const x = Number(v);
  return isNaN(x) ? 0 : x;
}

// ── Pago por data: CL.VL_PAGO (liquidacoes) atribuido a CP.DATA_PGTO (pagamentos) ──
// Exportado para que main.js possa calcular uma vez e passar às duas funções.
// Logica: empenho → liquidacoes (join por NUM_EMP) → pagamentos (join por NUM_EMP).
// Quando um empenho tem varios pagamentos, o total de VL_PAGO e distribuido
// proporcionalmente ao VL_LIQUIDO de cada pagamento (pro-rate).
// Quando pSum=0 (todos os pagamentos tem VL_LIQUIDO=0), distribui igualmente entre
// os pagamentos do empenho para evitar sobrecontagem.
// Fallback: se o join falhar (campo NUM_EMP vazio), usa CP.VL_LIQUIDO.
export function buildPagoByDate(liqRows: readonly LiqRow[], pgtoRows: readonly PgtoRow[]): Record<string, number> {
  // Soma VL_PAGO por numero de empenho (das liquidacoes)
  const liqPagoByEmp: NumericMap = {};
  for (const r of liqRows) {
    const num = String(r[CL.NUM_EMP] ?? '').trim();
    if (!num) continue;
    liqPagoByEmp[num] = (liqPagoByEmp[num] || 0) + n(r[CL.VL_PAGO]);
  }

  // Soma VL_LIQUIDO e contagem por numero de empenho (dos pagamentos) para pro-rate
  const pgtoSumByEmp:   NumericMap = {};
  const pgtoCountByEmp: NumericMap = {};
  for (const r of pgtoRows) {
    const num = String(r[CP.NUM_EMP] ?? '').trim();
    if (!num) continue;
    pgtoSumByEmp[num]   = (pgtoSumByEmp[num]   || 0) + n(r[CP.VL_LIQUIDO]);
    pgtoCountByEmp[num] = (pgtoCountByEmp[num]  || 0) + 1;
  }

  // Atribui parcela de VL_PAGO a cada DATA_PGTO
  const byDate: NumericMap = {};
  for (const r of pgtoRows) {
    const date  = String(r[CP.DATA_PGTO] ?? '').trim();
    const num   = String(r[CP.NUM_EMP]   ?? '').trim();
    const vlLiq = n(r[CP.VL_LIQUIDO]);
    if (!date) continue;

    let value: number;
    if (num && liqPagoByEmp[num] !== undefined) {
      const pSum   = pgtoSumByEmp[num]   || 0;
      const pCount = pgtoCountByEmp[num] || 1;
      if (pSum > 0) {
        // Pro-rate por VL_LIQUIDO
        value = liqPagoByEmp[num] * (vlLiq / pSum);
      } else {
        // Distribuicao igual (todos VL_LIQUIDO=0 — evita sobrecontagem)
        value = liqPagoByEmp[num] / pCount;
      }
    } else {
      // Fallback: join nao disponivel, usa VL_LIQUIDO do proprio pagamento
      value = vlLiq;
    }
    byDate[date] = (byDate[date] || 0) + value;
  }

  return byDate;
}

/** Retorna lista de unidades orcamentarias unicas a partir dos empenhos. */
export function getUnidades(empRows: readonly EmpRow[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const r of empRows) {
    const v = String(r[CE.UNIDADE] ?? '').trim();
    if (v && !seen.has(v)) { seen.add(v); result.push(v); }
  }
  return result.sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/** Filtra empenhos, liquidacoes e pagamentos por intervalo de datas (ini/fim = Date midnight | null). */
export function filterByPeriodo(
  empRows: readonly EmpRow[],
  liqRows: readonly LiqRow[],
  pgtoRows: readonly PgtoRow[],
  ini: Date | null,
  fim: Date | null,
): FilteredTriple {
  if (!ini && !fim) return { empRows: empRows as EmpRow[], liqRows: liqRows as LiqRow[], pgtoRows: pgtoRows as PgtoRow[] };

  const inRange = (dateStr: unknown): boolean => {
    const d = parseDDMMYYYY(String(dateStr ?? '').trim());
    if (!d) return false;
    if (ini && d < ini) return false;
    if (fim && d > fim) return false;
    return true;
  };

  return {
    empRows:  empRows.filter(r  => inRange(r[CE.DATA])),
    liqRows:  liqRows.filter(r  => inRange(r[CL.DATA_LIQ])),
    pgtoRows: pgtoRows.filter(r => inRange(r[CP.DATA_PGTO])),
  };
}

/** Filtra empenhos, liquidacoes e pagamentos por unidade orcamentaria. */
export function filterByUnidade(
  empRows: readonly EmpRow[],
  liqRows: readonly LiqRow[],
  pgtoRows: readonly PgtoRow[],
  unidade: string | null | undefined,
): FilteredTriple {
  if (!unidade) return { empRows: empRows as EmpRow[], liqRows: liqRows as LiqRow[], pgtoRows: pgtoRows as PgtoRow[] };
  const u = unidade.trim().toLowerCase();

  const filtEmp = empRows.filter(r =>
    String(r[CE.UNIDADE] ?? '').trim().toLowerCase() === u,
  );

  // Conjunto de Nº Empenho (string) e Id numérico dos empenhos filtrados
  const empNums = new Set(filtEmp.map(r => String(r[CE.NUM_EMP] ?? '')).filter(Boolean));
  const empIds  = new Set(filtEmp.map(r => Number(r[CE.ID] ?? 0)).filter(id => id > 0));

  // Filtra liquidacoes pelo numero do empenho correspondente
  const filtLiq = liqRows.filter(r => empNums.has(String(r[CL.NUM_EMP] ?? '')));

  // Filtra pagamentos:
  //   1º join por Nº Empenho (string CP.NUM_EMP ↔ CE.NUM_EMP)
  //   2º fallback por Id numérico (CP.ID_EMP ↔ CE.ID) quando o Nº Empenho está vazio
  const filtPgto = pgtoRows.filter(r => {
    const numEmp = String(r[CP.NUM_EMP] ?? '').trim();
    if (numEmp && empNums.has(numEmp)) return true;
    const idEmp  = Number(r[CP.ID_EMP] ?? 0);
    return idEmp > 0 && empIds.has(idEmp);
  });

  return { empRows: filtEmp, liqRows: filtLiq, pgtoRows: filtPgto };
}

// ── Helpers de filtro por campo de empenho ──────────────────────────────────────

/** Join interno: dado um subset de empRows, retorna liq/pgto correspondentes.
 *  Usa Nº Empenho (string) como chave primária; CE.ID (numérico) como fallback
 *  para pagamentos que chegam sem o campo string. */
function _joinEmpLiqPgto(
  filtEmp: EmpRow[],
  liqRows: readonly LiqRow[],
  pgtoRows: readonly PgtoRow[],
): FilteredTriple {
  const empNums = new Set(filtEmp.map(r => String(r[CE.NUM_EMP] ?? '')).filter(Boolean));
  const empIds  = new Set(filtEmp.map(r => Number(r[CE.ID] ?? 0)).filter(id => id > 0));
  const filtLiq  = liqRows.filter(r => empNums.has(String(r[CL.NUM_EMP] ?? '')));
  const filtPgto = pgtoRows.filter(r => {
    const num = String(r[CP.NUM_EMP] ?? '').trim();
    const id  = Number(r[CP.ID_EMP]  ?? 0);
    return (num && empNums.has(num)) || (id > 0 && empIds.has(id));
  });
  return { empRows: filtEmp, liqRows: filtLiq, pgtoRows: filtPgto };
}

/** Filtra empenhos pelo Elemento de Despesa (CE.ELEMENTO) e propaga às liq/pgto. */
export function filterByElemento(
  empRows: readonly EmpRow[],
  liqRows: readonly LiqRow[],
  pgtoRows: readonly PgtoRow[],
  elemento: string | null | undefined,
): FilteredTriple {
  if (!elemento) return { empRows: empRows as EmpRow[], liqRows: liqRows as LiqRow[], pgtoRows: pgtoRows as PgtoRow[] };
  return _joinEmpLiqPgto(
    empRows.filter(r => String(r[CE.ELEMENTO] ?? '') === elemento),
    liqRows, pgtoRows,
  );
}

/** Filtra empenhos pela Ação (CE.ACAO) e propaga às liq/pgto. */
export function filterByAcao(
  empRows: readonly EmpRow[],
  liqRows: readonly LiqRow[],
  pgtoRows: readonly PgtoRow[],
  acao: string | null | undefined,
): FilteredTriple {
  if (!acao) return { empRows: empRows as EmpRow[], liqRows: liqRows as LiqRow[], pgtoRows: pgtoRows as PgtoRow[] };
  return _joinEmpLiqPgto(
    empRows.filter(r => String(r[CE.ACAO] ?? '') === acao),
    liqRows, pgtoRows,
  );
}

/** Filtra empenhos pelo N. Contrato (via contratoMap: Map<empNum, string>) e propaga.
 *  contratoMap é construído em buscarDadosDattago a partir de enrichedEmpRows[21]. */
export function filterByContrato(
  empRows: readonly EmpRow[],
  liqRows: readonly LiqRow[],
  pgtoRows: readonly PgtoRow[],
  contrato: string | null | undefined,
  contratoMap: ContratoMap | null | undefined,
): FilteredTriple {
  if (!contrato || !contratoMap) return { empRows: empRows as EmpRow[], liqRows: liqRows as LiqRow[], pgtoRows: pgtoRows as PgtoRow[] };
  return _joinEmpLiqPgto(
    empRows.filter(r => {
      const nc = contratoMap.get(String(r[CE.NUM_EMP] ?? '').trim()) ?? '';
      return nc.split(', ').includes(contrato);
    }),
    liqRows, pgtoRows,
  );
}

/** Agrega empenhos e liquidações por N. Contrato (via contratoMap).
 *  Um empenho pode pertencer a múltiplos contratos (vírgula-separados).
 *  Retorna array de { contrato, empenhado, liquidado, anulado, retido, pago, pagoLiquido }. */
export function computeByContrato(
  empRows: readonly EmpRow[],
  liqRows: readonly LiqRow[],
  contratoMap: ContratoMap | null | undefined,
): ContratoSummary[] {
  if (!contratoMap?.size) return [];
  const empSum: NumericMap = {};       // contrato → empenhado
  const liqSum: EntryMap   = {};       // contrato → {valor, pago, anulado}
  const empContratos = new Map<string, string[]>(); // numEmp → string[] — reutilizado no join liq

  for (const r of empRows) {
    const num = String(r[CE.NUM_EMP] ?? '').trim();
    const nc  = contratoMap.get(num) ?? '';
    const vl  = n(r[CE.VL_EMP]);
    const cs  = nc.split(', ').filter(Boolean);
    if (!cs.length) continue;
    empContratos.set(num, cs);
    for (const c of cs) {
      empSum[c] = (empSum[c] || 0) + vl;
    }
  }

  const mkEntry = (): LiqEntry => ({ valor: 0, pago: 0, anulado: 0 });
  for (const r of liqRows) {
    const num = String(r[CL.NUM_EMP] ?? '').trim();
    const cs  = empContratos.get(num) ?? [];
    for (const c of cs) {
      if (!liqSum[c]) liqSum[c] = mkEntry();
      liqSum[c].valor   += n(r[CL.VALOR]);
      liqSum[c].pago    += n(r[CL.VL_PAGO]);
      liqSum[c].anulado += n(r[CL.VL_ANUL]);
    }
  }

  return Object.keys(empSum).map(c => {
    const l = liqSum[c] || mkEntry();
    return { contrato: c, empenhado: empSum[c], liquidado: l.valor,
             anulado: l.anulado, retido: 0, pago: l.pago, pagoLiquido: l.pago };
  });
}

/** Calcula KPIs totais a partir das tres tabelas Dattago. */
export function computeKpis(
  empRows: readonly EmpRow[],
  liqRows: readonly LiqRow[],
  pgtoRows: readonly PgtoRow[],
): KpiResults {
  let empenhado = 0;
  for (const r of empRows) empenhado += n(r[CE.VL_EMP]);

  let liquidado = 0, anulado = 0, pago = 0;
  let qtdAnulados = 0;
  for (const r of liqRows) {
    liquidado += n(r[CL.VALOR]);
    const a = n(r[CL.VL_ANUL]);
    anulado  += a;
    pago     += n(r[CL.VL_PAGO]);
    if (a > 0) qtdAnulados++;
  }

  return {
    empenhado,
    liquidado,
    anulado,
    retido: 0,
    pagoLiquido: pago,
    pago,
    pctLiquidado: empenhado > 0 ? liquidado / empenhado : 0,
    pctPago:      empenhado > 0 ? pago      / empenhado : 0,
    qtdEmpenhos:    empRows.length,
    qtdLiquidacoes: liqRows.length,
    qtdPagamentos:  pgtoRows.length,
    qtdAnulados,
    qtdRetidos: 0,
  };
}


// ── computeAllGrouped: agrupamento único em 8 dimensões ─────────────────────────
// Uma passagem em empRows, uma (mais pré-passo para credor) em liqRows.
// Retorna { orgaos, unidades, acoes, elementos, programas, fontes, credores, numlicits }.
export function computeAllGrouped(
  empRows: readonly EmpRow[],
  liqRows: readonly LiqRow[],
): ComputeAllGroupedResult {
  // Pré-passo: NUM_EMP → primeiro credor encontrado nas liquidações
  const liqCredorByEmp: Record<string, string> = {};
  for (const r of liqRows) {
    const num  = String(r[CL.NUM_EMP] ?? '').trim();
    const cred = String(r[CL.CREDOR]  ?? '').trim();
    if (num && cred && !liqCredorByEmp[num]) liqCredorByEmp[num] = cred;
  }

  interface EmpAttrs {
    orgao: string; unidade: string; acao: string; elemento: string;
    programa: string; fonte: string; credor: string; numlicit: string;
  }

  // Mapa NUM_EMP → atributos de agrupamento — uma passagem em empRows
  const empByNum: Record<string, EmpAttrs> = {};
  const empTotals = {
    orgao:    {} as NumericMap, unidade: {} as NumericMap,
    acao:     {} as NumericMap, elemento: {} as NumericMap,
    programa: {} as NumericMap, fonte:    {} as NumericMap,
    credor:   {} as NumericMap, numlicit: {} as NumericMap,
  };

  for (const r of empRows) {
    const num      = String(r[CE.NUM_EMP]   ?? '').trim();
    const orgao    = String(r[CE.ORGAO]     ?? '').trim();
    const unidade  = String(r[CE.UNIDADE]   ?? '').trim();
    const acao     = String(r[CE.ACAO]      ?? '').trim();
    const elemento = String(r[CE.ELEMENTO]  ?? '').trim();
    const programa = String(r[CE.PROGRAMA]  ?? '').trim();
    const fonte    = String(r[CE.FONTE]     ?? '').trim();
    const credor   = liqCredorByEmp[num]    ?? '';
    const numlicit = String(r[CE.ID_LICIT]  ?? '').trim();
    const vl = n(r[CE.VL_EMP]);

    if (num) empByNum[num] = { orgao, unidade, acao, elemento, programa, fonte, credor, numlicit };

    if (orgao)    empTotals.orgao[orgao]       = (empTotals.orgao[orgao]       || 0) + vl;
    if (unidade)  empTotals.unidade[unidade]   = (empTotals.unidade[unidade]   || 0) + vl;
    if (acao)     empTotals.acao[acao]         = (empTotals.acao[acao]         || 0) + vl;
    if (elemento) empTotals.elemento[elemento] = (empTotals.elemento[elemento] || 0) + vl;
    if (programa) empTotals.programa[programa] = (empTotals.programa[programa] || 0) + vl;
    if (fonte)    empTotals.fonte[fonte]       = (empTotals.fonte[fonte]       || 0) + vl;
    if (credor)   empTotals.credor[credor]     = (empTotals.credor[credor]     || 0) + vl;
    if (numlicit) empTotals.numlicit[numlicit] = (empTotals.numlicit[numlicit] || 0) + vl;
  }

  // Agrega liq → todas as dimensões — uma passagem em liqRows
  const liqTotals = {
    orgao:    {} as EntryMap, unidade: {} as EntryMap,
    acao:     {} as EntryMap, elemento: {} as EntryMap,
    programa: {} as EntryMap, fonte:    {} as EntryMap,
    credor:   {} as EntryMap, numlicit: {} as EntryMap,
  };
  const mkEntry = (): LiqEntry => ({ valor: 0, pago: 0, anulado: 0 });

  for (const r of liqRows) {
    const num = String(r[CL.NUM_EMP] ?? '').trim();
    const emp = empByNum[num];
    if (!emp) continue;

    const valor   = n(r[CL.VALOR]);
    const pago    = n(r[CL.VL_PAGO]);
    const anulado = n(r[CL.VL_ANUL]);

    const apply = (map: EntryMap, key: string): void => {
      if (!key) return;
      if (!map[key]) map[key] = mkEntry();
      map[key].valor   += valor;
      map[key].pago    += pago;
      map[key].anulado += anulado;
    };
    apply(liqTotals.orgao,    emp.orgao);
    apply(liqTotals.unidade,  emp.unidade);
    apply(liqTotals.acao,     emp.acao);
    apply(liqTotals.elemento, emp.elemento);
    apply(liqTotals.programa, emp.programa);
    apply(liqTotals.fonte,    emp.fonte);
    apply(liqTotals.credor,   emp.credor);
    apply(liqTotals.numlicit, emp.numlicit);
  }

  // Constrói arrays de resultado no mesmo formato de computeAgrupado
  function toArray(empMap: NumericMap, liqMap: EntryMap, keyName: string): GroupedRow[] {
    return Object.keys(empMap).map(k => {
      const l = liqMap[k] || mkEntry();
      const obj: GroupedRow = {
        empenhado:   empMap[k],
        liquidado:   l.valor,
        pago:        l.pago,
        anulado:     l.anulado,
        retido:      0,
        pagoLiquido: l.pago,
      };
      obj[keyName] = k;
      return obj;
    });
  }

  return {
    orgaos:    toArray(empTotals.orgao,    liqTotals.orgao,    'orgao'),
    unidades:  toArray(empTotals.unidade,  liqTotals.unidade,  'unidade'),
    acoes:     toArray(empTotals.acao,     liqTotals.acao,     'acao'),
    elementos: toArray(empTotals.elemento, liqTotals.elemento, 'elemento'),
    programas: toArray(empTotals.programa, liqTotals.programa, 'programa'),
    fontes:    toArray(empTotals.fonte,    liqTotals.fonte,    'fonte'),
    credores:  toArray(empTotals.credor,   liqTotals.credor,   'credor'),
    numlicits: toArray(empTotals.numlicit, liqTotals.numlicit, 'numlicit'),
  };
}

// Agrupa por dia: emp usa CE.DATA + CE.VL_EMP, liq usa CL.DATA_LIQ + CL.VALOR,
// pago usa CP.DATA_PGTO (datas) + CL.VL_PAGO (valores via join por empenho)
export function computeDiario(
  empRows: readonly EmpRow[],
  liqRows: readonly LiqRow[],
  pgtoRows: readonly PgtoRow[],
  _pagoByDate: Record<string, number> | null = null,
): DiarioResult {
  const empByDay: NumericMap = {};
  for (const r of empRows) {
    const key = String(r[CE.DATA] ?? '').trim();
    if (!key) continue;
    empByDay[key] = (empByDay[key] || 0) + n(r[CE.VL_EMP]);
  }

  interface LiqDay { liq: number; anul: number }
  const liqByDay: Record<string, LiqDay> = {};
  for (const r of liqRows) {
    const key = String(r[CL.DATA_LIQ] ?? '').trim();
    if (!key) continue;
    if (!liqByDay[key]) liqByDay[key] = { liq: 0, anul: 0 };
    liqByDay[key].liq  += n(r[CL.VALOR]);
    liqByDay[key].anul += n(r[CL.VL_ANUL]);
  }

  // Pago: usa resultado pre-computado se fornecido, senao calcula aqui
  const pgtoByDay = _pagoByDate ?? buildPagoByDate(liqRows, pgtoRows);

  const allKeys = new Set([
    ...Object.keys(empByDay),
    ...Object.keys(liqByDay),
    ...Object.keys(pgtoByDay),
  ]);

  const simples: DiarioSimples[] = [...allKeys]
    .map(key => {
      const d = parseDDMMYYYY(key);
      if (!d) return null;
      const li = liqByDay[key]  || { liq: 0, anul: 0 };
      return {
        data:      key,
        date:      d,
        empenhado: empByDay[key]  || 0,
        liquidado: li.liq,
        anulado:   li.anul,
        retido:    0,
        pagoLiquido: pgtoByDay[key] || 0,
        pago:      pgtoByDay[key] || 0,
      };
    })
    .filter((d): d is DiarioSimples => d !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  let accEmp = 0, accLiq = 0, accPago = 0;
  const acumulado: DiarioAcumulado[] = simples.map(d => {
    accEmp  += d.empenhado;
    accLiq  += d.liquidado;
    accPago += d.pago;
    return { ...d, empAcum: accEmp, liqAcum: accLiq, pagoAcum: accPago };
  });

  return { simples, acumulado };
}

// Agrupa por mes: emp usa CE.DATA + CE.VL_EMP, liq usa CL.DATA_LIQ + CL.VALOR,
// pago usa CP.DATA_PGTO (datas) + CL.VL_PAGO (valores via join por empenho)
export function computeMensal(
  empRows: readonly EmpRow[],
  liqRows: readonly LiqRow[],
  pgtoRows: readonly PgtoRow[],
  _pagoByDate: Record<string, number> | null = null,
): MensalResult {
  const empBucket:  NumericMap = {};
  interface LiqMonth { liq: number; anul: number }
  const liqBucket:  Record<number, LiqMonth> = {};
  const pgtoBucket: NumericMap = {};
  let totalEmp = 0;

  for (const r of empRows) {
    const v = n(r[CE.VL_EMP]);
    totalEmp += v;
    const d = parseDDMMYYYY(r[CE.DATA]);
    if (!d) continue;
    const m = d.getMonth() + 1;
    empBucket[m] = (empBucket[m] || 0) + v;
  }

  for (const r of liqRows) {
    const dliq = parseDDMMYYYY(r[CL.DATA_LIQ]);
    if (dliq) {
      const m = dliq.getMonth() + 1;
      if (!liqBucket[m]) liqBucket[m] = { liq: 0, anul: 0 };
      liqBucket[m].liq  += n(r[CL.VALOR]);
      liqBucket[m].anul += n(r[CL.VL_ANUL]);
    }
  }

  // Pago: usa resultado pre-computado se fornecido, senao calcula aqui
  const pagoByDate = _pagoByDate ?? buildPagoByDate(liqRows, pgtoRows);
  for (const [dateStr, value] of Object.entries(pagoByDate)) {
    const d = parseDDMMYYYY(dateStr);
    if (!d) continue;
    const m = d.getMonth() + 1;
    pgtoBucket[m] = (pgtoBucket[m] || 0) + value;
  }

  // Determina o ultimo mes com dados reais; assim anos historicos mostram 12 meses
  // e o ano corrente mostra apenas os meses ja encerrados.
  const allDataMonths = [
    ...Object.keys(empBucket),
    ...Object.keys(liqBucket),
    ...Object.keys(pgtoBucket),
  ].map(Number).filter(m => m >= 1 && m <= 12);
  const mesMax = allDataMonths.length > 0
    ? Math.max(...allDataMonths)
    : new Date().getMonth() + 1;

  const simples: MensalSimples[] = [];
  for (let mes = 1; mes <= mesMax; mes++) {
    const emp  = empBucket[mes]  || 0;
    const liqD = liqBucket[mes]  || { liq: 0, anul: 0 };
    const pago = pgtoBucket[mes] || 0;
    simples.push({
      mes,
      empenhado:   emp,
      liquidado:   liqD.liq,
      anulado:     liqD.anul,
      retido:      0,
      pagoLiquido: pago,
      pago,
    });
  }

  const acumulado: MensalAcumulado[] = [];
  let accEmp = 0, accLiq = 0, accPago = 0;
  for (const d of simples) {
    accEmp  += d.empenhado;
    accLiq  += d.liquidado;
    accPago += d.pago;
    acumulado.push({ mes: d.mes, empAcum: accEmp, liqAcum: accLiq, pagoAcum: accPago });
  }

  const base = totalEmp || 1;
  const percentual: MensalPercentual[] = acumulado.map((d, i) => ({
    mes: d.mes,
    empenhado:    simples[i].empenhado,
    liquidado:    simples[i].liquidado,
    anulado:      simples[i].anulado,
    retido:       simples[i].retido,
    pago:         simples[i].pago,
    empAcum:      d.empAcum,
    liqAcum:      d.liqAcum,
    pagoAcum:     d.pagoAcum,
    pctEmpenhado: d.empAcum  / base,
    pctLiquidado: d.liqAcum  / base,
    pctPago:      d.pagoAcum / base,
  }));

  return { simples, acumulado, percentual };
}

/** Filtra empenhos pelo N. Licitação (CE.ID_LICIT) e propaga às liq/pgto. */
export function filterByLicit(
  empRows: readonly EmpRow[],
  liqRows: readonly LiqRow[],
  pgtoRows: readonly PgtoRow[],
  licit: string | null | undefined,
): FilteredTriple {
  if (!licit) return { empRows: empRows as EmpRow[], liqRows: liqRows as LiqRow[], pgtoRows: pgtoRows as PgtoRow[] };
  return _joinEmpLiqPgto(
    empRows.filter(r => String(r[CE.ID_LICIT] ?? '').trim() === licit),
    liqRows, pgtoRows,
  );
}

/** Filtra por Credor (CL.CREDOR na liquidação) e propaga. */
export function filterByCredor(
  empRows: readonly EmpRow[],
  liqRows: readonly LiqRow[],
  pgtoRows: readonly PgtoRow[],
  credor: string | null | undefined,
): FilteredTriple {
  if (!credor) return { empRows: empRows as EmpRow[], liqRows: liqRows as LiqRow[], pgtoRows: pgtoRows as PgtoRow[] };
  const filtLiq = liqRows.filter(r => String(r[CL.CREDOR] ?? '').trim() === credor);
  const empNums = new Set(filtLiq.map(r => String(r[CL.NUM_EMP] ?? '').trim()).filter(Boolean));
  const filtEmp  = empRows.filter(r => empNums.has(String(r[CE.NUM_EMP] ?? '')));
  const filtPgto = pgtoRows.filter(r => {
    const num = String(r[CP.NUM_EMP] ?? '').trim();
    return num !== '' && empNums.has(num);
  });
  return { empRows: filtEmp, liqRows: filtLiq, pgtoRows: filtPgto };
}

// ── Classificação Visão (PCA / Folha / Outros) ────────────────────────────────
// Codigos extraídos do legacy components/filters.js — classificam elementos
// de despesa em 3 buckets. RAP usa fonte de dados separada (data.rap.*).

const PCA_CODIGOS: ReadonlySet<string> = new Set([
  '4.4.90.61.00', '3.3.90.92.00', '4.4.20.52.00', '4.4.90.52.00',
  '4.4.90.93.00', '3.3.90.30.00', '3.3.90.32.00', '4.4.90.51.00',
  '3.3.90.13.00', '3.3.90.34.00', '3.3.90.48.00', '3.3.90.36.00',
  '3.3.90.39.00', '3.3.91.39.00', '3.3.90.33.00', '3.3.90.31.00',
  '4.4.90.35.00', '3.3.90.40.00',
]);

const FOLHA_CODIGOS: ReadonlySet<string> = new Set([
  '3.3.90.19.00', '3.3.90.46.00', '3.3.90.49.00', '3.3.50.42.00',
  '3.1.90.04.00', '3.3.50.41.00', '3.3.90.14.00', '3.1.90.94.00',
  '3.2.90.21.00', '3.1.90.13.00', '3.1.91.13.00', '3.3.90.47.00',
  '3.1.90.34.00', '3.2.90.22.00', '3.3.90.03.00', '4.6.90.71.00',
  '9.9.99.99.99', '3.2.90.91.00', '3.3.90.91.00', '3.3.50.43.00',
  '3.1.90.11.00',
]);

/** Filtra empRows/liqRows/pgtoRows pelo modo de Visão (PCA/Folha/Outros/Todos).
 *  'rap' é tratado exclusivamente no Painel (usa data.rap.* como fonte). */
export function filterByVisao(
  empRows: readonly EmpRow[],
  liqRows: readonly LiqRow[],
  pgtoRows: readonly PgtoRow[],
  visao: Visao,
): FilteredTriple {
  if (visao === 'todos' || visao === 'rap') {
    return { empRows: [...empRows], liqRows: [...liqRows], pgtoRows: [...pgtoRows] };
  }
  const filtEmp = empRows.filter((r) => {
    const elem = String(r[CE.ELEMENTO] ?? '').trim().split(/\s+/)[0];
    if (visao === 'pca')   return PCA_CODIGOS.has(elem);
    if (visao === 'folha') return FOLHA_CODIGOS.has(elem);
    // 'outros'
    return !PCA_CODIGOS.has(elem) && !FOLHA_CODIGOS.has(elem);
  });
  const empNums = new Set(
    filtEmp.map((r) => String(r[CE.NUM_EMP] ?? '').trim()).filter(Boolean),
  );
  return {
    empRows: filtEmp,
    liqRows:  liqRows.filter((r) => empNums.has(String(r[CL.NUM_EMP] ?? '').trim())),
    pgtoRows: pgtoRows.filter((r) => empNums.has(String(r[CP.NUM_EMP] ?? '').trim())),
  };
}

// ── Funcionalidade derivada do painel — não estava em compute.js ──────────────

/** Reconstrói campos acumulados (empAcum / liqAcum / pagoAcum) a partir do zero.
 *  Port de pages/painel.js — usado pelo drawer ao re-filtrar séries diárias. */
export function recomputeAcumulado(filtered: readonly DiarioSimples[]): DiarioAcumulado[] {
  let accEmp = 0, accLiq = 0, accPago = 0;
  return filtered.map(d => {
    accEmp  += d.empenhado || 0;
    accLiq  += d.liquidado || 0;
    accPago += d.pago      || 0;
    return { ...d, empAcum: accEmp, liqAcum: accLiq, pagoAcum: accPago };
  });
}
