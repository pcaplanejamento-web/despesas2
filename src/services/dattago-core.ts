// dattago-core.ts — Utilitários compartilhados da importação Vie Dattago.
//
// Port de assets/js/services/dattago-core.js (V3 — Service Layer).
// Contém: ImportLog, parsers, cache, HTTP, concorrência.
// Importado pelos arquivos individuais de cada API.
//
// MULTI-TENANT: BASE/UF/TENANT/ORGAOS/ORGAOS_BLOQUEADOS vêm de `@/config/tenant`.
// Pra adicionar município, edite src/config/tenant.ts (ver TenantConfig).

import { getCurrentTenant } from "@/config/tenant";
import type { Orgao } from "@/config/tenant";

const tenant = getCurrentTenant();
const BASE   = tenant.workerBase;
const UF     = tenant.uf;
const TENANT = tenant.tenantSlug;

export const TTL_MS      = 15 * 60 * 1000; // 15 min
export const CONCURRENCY       = 6; // padrão
export const CONCURRENCY_HEAVY = 3; // APIs pesadas por request (Liquidações, Orçamento)
export const CONCURRENCY_LIGHT = 5; // APIs com muitas tasks leves (Contratos)
export const MIN_COMPLETENESS = 1.0;
export const CACHE_VERSION    = 'v12'; // bump: Histórico sanitizado e preservado (antes zerado)

const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'] as const;

// ── Tipos públicos ────────────────────────────────────────────────────────────

// Re-export do tipo Orgao p/ compat — consumers ainda importam daqui.
export type { Orgao };

export interface MonthlyChunk {
  label: string;
  ini:   string;
  fin:   string;
}

export interface ImportDateRange {
  ini:     string;
  fin:     string;
  months:  number;
  opsEmp:  number;
  opsLiq:  number;
  opsPgto: number;
}

/** Captura motivo da falha em `dattagoPost` / `fetchAllPages` — passado por referência. */
export interface ErrorCap {
  code?:   number;
  reason?: string;
}

/** Resultado de `dattagoPost` quando a request foi rejeitada com 4xx (sem retry). */
export interface PermanentFailure {
  items:     null;
  permanent: true;
}

/** Resultado de `fetchAllPages` — agrega N requests paginadas em um único pacote. */
export interface FetchAllPagesResult<TItem = unknown> {
  items:     TItem[];
  failed:    boolean;
  permanent: boolean;
  totalReg:  number | null;
}

/** Entrada do array `rawByTask` mantido por cada getter de API. */
export interface TaskResult<TItem = unknown> {
  items:      TItem[];
  failed:     boolean;
  permanent?: boolean;
  orgao?:     Orgao;
  fonte?:     number;
}

/** Callback opcional para reportar progresso textual da importação. */
export type ProgressCallback = (message: string) => void;

/** Evento emitido para o painel de progresso a cada órgão/fonte concluído. */
export interface OnOrgaoEvent {
  api:           'emp' | 'liq' | 'pgto' | 'rec' | 'ctr';
  monthLabel?:   string | null;
  orgao?:        Orgao;
  orgaoIdx?:     number;
  fonteCode?:    number;
  count:         number;
  error?:        boolean;
  errorCode?:    number;
  errorReason?:  string;
  isRetry?:      boolean;
  fromCache?:    boolean;
}

export type OnOrgaoCallback = (event: OnOrgaoEvent) => void;

/** Referência mutável para o callback `onOrgao` — `retryLoop` substitui temporariamente. */
export interface OnOrgaoRef {
  current: OnOrgaoCallback | undefined;
}

// ── Tenant data (re-export — define em src/config/tenant.ts) ──────────────────

export const ORGAOS = tenant.orgaos;
export const ORGAOS_BLOQUEADOS = tenant.orgaosBloqueados;

export function isOrgaoBloqueado(nomeOrgao: unknown): boolean {
  return ORGAOS_BLOQUEADOS.has(String(nomeOrgao ?? '').trim().toLowerCase());
}

// ── ImportLog — registro por execução de API ──────────────────────────────────
//
// Cada função getXxx() cria uma instância, preenche durante a importação e
// a retorna junto com rows para exibição no painel de Log da aba Integrações.

/** Tipo de inconsistência detectada (TotalRegistros vs received). */
export interface Inconsistency {
  chunk:    string;
  reported: number;
  received: number;
  missing:  number;
}

/** Empenhos recuperados pelo fallback mensal (fase 2 do importer de Empenhos). */
export interface RecoveredItem {
  numero: string;
  orgao:  string;
  data:   string;
}

export type ImportStatus = 'IMPORTANDO' | 'COMPLETO' | 'PARCIAL' | 'FALHOU';

export class ImportLog {
  apiName:      string;
  endpoint:     string;
  startedAt:    Date;
  finishedAt:   Date | null = null;
  elapsedMs:    number = 0;
  dateRange:    string = '—';
  taskCount:    number = 0;
  tasksOk:      number = 0;
  tasksFailed:  number = 0;
  retryRounds:  number = 0;
  rawCount:     number = 0;
  importedCount: number = 0;
  ignoredCount: number = 0;
  apiReported:  number | null = null;
  inconsistencies: Inconsistency[] = [];
  recoveredItems:  RecoveredItem[] = [];
  status:       ImportStatus = 'IMPORTANDO';

  constructor(apiName: string, endpoint: string) {
    this.apiName  = apiName;          // 'Empenhos' | 'Liquidações' | 'Pagamentos' | 'Orçamento'
    this.endpoint = endpoint;         // 'getempenhos' etc.
    this.startedAt = new Date();
  }

  finish(completeness: number): void {
    this.finishedAt   = new Date();
    this.elapsedMs    = this.finishedAt.getTime() - this.startedAt.getTime();
    this.ignoredCount = Math.max(0, this.rawCount - this.importedCount);
    this.tasksOk      = this.taskCount - this.tasksFailed;
    this.status       = completeness >= 1.0
      ? (this.tasksFailed > 0 ? 'PARCIAL' : 'COMPLETO')
      : 'FALHOU';
  }
}

// ── Helpers básicos ───────────────────────────────────────────────────────────

const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

function fmtDate(d: Date): string {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

/** Gera fatias mensais do período de importação.
 *  Para o ano corrente, a última fatia encerra HOJE (não em 31/dez),
 *  evitando requisições desnecessárias para meses futuros. */
export function monthlyChunks(year: number): MonthlyChunk[] {
  const today    = new Date();
  const curYear  = today.getFullYear();
  const curMonth = today.getMonth(); // 0-indexed
  const lastMonth = (year === curYear) ? curMonth : 11;

  return Array.from({ length: lastMonth + 1 }, (_, m) => {
    const isLast = (year === curYear && m === curMonth);
    return {
      label: `${MESES_ABREV[m]}/${year}`,
      ini:   fmtDate(new Date(year, m, 1)),
      fin:   isLast ? fmtDate(today) : fmtDate(new Date(year, m + 1, 0)),
    };
  });
}

/** Retorna o intervalo de datas e o nº de meses para o ano informado.
 *  opsEmp=opsPgto=1: requisição única. opsLiq=ORGAOS.length: por-órgão obrigatório. */
export function getImportDateRange(year: number): ImportDateRange {
  const chunks = monthlyChunks(year);
  return {
    ini:     chunks[0].ini,
    fin:     chunks[chunks.length - 1].fin,
    months:  chunks.length,
    opsEmp:  1,
    opsLiq:  ORGAOS.length,
    opsPgto: 1,
  };
}

// ── Normaliza data para dd/mm/yyyy ────────────────────────────────────────────

export function normDate(v: unknown): string {
  if (!v) return '';
  const s = String(v).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return s;
}

// ── Valor monetário ───────────────────────────────────────────────────────────

export function fMoney(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  let s = String(v).replace(/\s/g, '').replace('R$', '').trim();
  if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

export function str(v: unknown): string { return v != null ? String(v) : ''; }

// ── Pipeline de parse JSON ────────────────────────────────────────────────────

function sanitizeCtrl(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

function fixLiteralNewlines(text: string): string {
  let out = '';
  let inStr = false;
  let esc   = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (esc) { out += ch; esc = false; continue; }
    if (ch === '\\' && inStr) { out += ch; esc = true; continue; }
    if (ch === '"') { inStr = !inStr; out += ch; continue; }
    if (inStr) {
      const code = ch.charCodeAt(0);
      if (code === 0x0A) { out += '\\n'; continue; }
      if (code === 0x0D) { out += '\\r'; continue; }
      if (code === 0x09) { out += '\\t'; continue; }
      if (code < 0x20)   { out += `\\u${code.toString(16).padStart(4,'0')}`; continue; }
    }
    out += ch;
  }
  return out;
}

const BLANK_FIELDS_RE = new RegExp(
  '"(?:Historico|Observacao|Descricao|MotivoAnulacao)"\\s*:\\s*"[\\s\\S]*?"(?=\\s*(?:[}\\]]|,\\s*"\\w+"\\s*:))',
  'g',
);

function blankTextFields(text: string): string {
  return text.replace(BLANK_FIELDS_RE, m => `"${m.match(/"(\w+)"/)![1]}":""`);
}

const ESCAPE_FIELDS_RE = new RegExp(
  '"(Historico|Observacao|Descricao|MotivoAnulacao)"\\s*:\\s*"([\\s\\S]*?)"(?=\\s*(?:[}\\]]|,\\s*"\\w+"\\s*:))',
  'g',
);

function escapeQuotesInFields(text: string): string {
  return text.replace(ESCAPE_FIELDS_RE, (_, field: string, value: string) => {
    const safe = value
      .replace(/\\"/g, '\x01')
      .replace(/"/g,   '\\"')
      .replace(/\x01/g, '\\"');
    return `"${field}":"${safe}"`;
  });
}

// Zera campos de texto longo ANTES do JSON.parse — causa #1 de falhas de parse:
// aspas internas não escapadas (ex.: `PROJETO "CURSO DE VIOLÃO", CONFORME ...`),
// quebras de linha literais, caracteres de controle dentro do texto livre.
// Scanner char-by-char com heurística robusta de fim de valor.
const STRIP_FIELDS_RE = /"(Historico|Observacao|Descricao|MotivoAnulacao)"\s*:\s*"/g;
function isWs(c: string): boolean { return c === ' ' || c === '\t' || c === '\r' || c === '\n'; }

/** Sanitiza o conteúdo bruto de um campo de texto livre (Historico, etc.).
 *  Preserva caracteres portugueses (á é ã ç etc.) e remove/escapa apenas
 *  os chars inválidos em JSON. */
function sanitizeFieldValue(raw: string): string {
  let result = '';
  let i = 0;
  while (i < raw.length) {
    const c    = raw[i];
    const code = c.charCodeAt(0);

    if (c === '\\' && i + 1 < raw.length) {
      const next     = raw[i + 1];
      const nextCode = next.charCodeAt(0);
      if ('"\\/bfnrtu'.includes(next)) {
        result += c + next;               // sequência de escape válida — mantém
      } else if (nextCode < 0x20 || nextCode === 0x7F) {
        result += '\\\\';                 // char ctrl após barra — escapa barra, descarta ctrl
      } else {
        result += '\\\\' + next;          // escape inválido — escapa barra, mantém char
      }
      i += 2;
      continue;
    }

    if (c === '"')      { result += '\\"';  i++; continue; }   // aspas não escapadas
    if (code === 0x0A)  { result += '\\n';  i++; continue; }   // LF literal → \n
    if (code === 0x0D)  { result += '\\r';  i++; continue; }   // CR literal → \r
    if (code === 0x09)  { result += '\\t';  i++; continue; }   // TAB literal → \t
    if (code < 0x20 || code === 0x7F) { i++; continue; }       // outros ctrl → remove

    result += c;  // char normal (ASCII ou Unicode: á é ã ç etc.)
    i++;
  }
  return result;
}

/** Substitui stripTextFields: em vez de descartar o conteúdo dos campos de texto
 *  livre, sanitiza-o e o preserva para exibição nas tabelas. */
function sanitizeTextFields(text: string): string {
  let out = '';
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  STRIP_FIELDS_RE.lastIndex = 0;
  while ((m = STRIP_FIELDS_RE.exec(text)) !== null) {
    out += text.slice(lastEnd, m.index) + m[0]; // prefixo + "FieldName":"
    let j = m.index + m[0].length;
    const valStart = j;

    // Mesmo scanner de fim-de-valor de stripTextFields
    while (j < text.length) {
      const c = text[j];
      if (c === '\\' && j + 1 < text.length) { j += 2; continue; }
      if (c === '"') {
        let k = j + 1;
        while (k < text.length && isWs(text[k])) k++;
        if (k >= text.length || text[k] === '}' || text[k] === ']') break;
        if (text[k] === ',') {
          let p = k + 1;
          while (p < text.length && isWs(text[p])) p++;
          if (text[p] === '}' || text[p] === ']') break;
          if (text[p] === '"') {
            let q = p + 1;
            while (q < text.length && /[A-Za-z0-9_]/.test(text[q])) q++;
            if (q > p + 1 && text[q] === '"') {
              let r = q + 1;
              while (r < text.length && isWs(text[r])) r++;
              if (text[r] === ':') break;
            }
          }
        }
      }
      j++;
    }

    // Coleta conteúdo bruto e sanitiza (preserva texto, limpa chars inválidos)
    out += sanitizeFieldValue(text.slice(valStart, j)) + '"';
    lastEnd = j + 1;
    STRIP_FIELDS_RE.lastIndex = lastEnd;
  }
  out += text.slice(lastEnd);
  return out;
}

function parseItemByItem(text: string): unknown[] {
  const results: unknown[] = [];
  let depth = 0, inString = false, escape = false, start = -1;
  const n = text.length;

  for (let i = 0; i < n; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }

    if (inString) {
      if (c === '\\') { escape = true; continue; }
      if (c === '"') {
        let j = i + 1;
        while (j < n && (text[j] === ' ' || text[j] === '\t' || text[j] === '\r' || text[j] === '\n')) j++;
        const nx = j < n ? text[j] : '';
        let isClose = (nx === ':' || nx === '}' || nx === ']' || j >= n);
        if (!isClose && nx === ',') {
          let k = j + 1;
          while (k < n && (text[k] === ' ' || text[k] === '\t' || text[k] === '\r' || text[k] === '\n')) k++;
          if (text[k] === '"') {
            let mm = k + 1;
            while (mm < n && /[A-Za-z0-9_]/.test(text[mm])) mm++;
            if (mm > k + 1 && text[mm] === '"') {
              let p = mm + 1;
              while (p < n && (text[p] === ' ' || text[p] === '\t' || text[p] === '\r' || text[p] === '\n')) p++;
              if (text[p] === ':') isClose = true;
            }
          } else if (text[k] === '}' || text[k] === ']') {
            isClose = true;
          }
        }
        if (isClose) inString = false;
      }
      continue;
    }

    if (c === '"') { inString = true; continue; }
    if (c === '{') {
      if (depth++ === 0) start = i;
    } else if (c === '}') {
      if (--depth === 0 && start >= 0) {
        const chunk = sanitizeCtrl(text.slice(start, i + 1));
        try {
          results.push(JSON.parse(chunk));
        } catch {
          const fixed  = fixLiteralNewlines(chunk);
          try { results.push(JSON.parse(fixed)); } catch {
            const quoted = escapeQuotesInFields(fixed);
            try { results.push(JSON.parse(quoted)); } catch {
              try { results.push(JSON.parse(blankTextFields(quoted))); } catch { /* skip */ }
            }
          }
        }
        start = -1;
      }
    }
  }
  return results;
}

interface MaybeContainer {
  data?:       unknown;
  items?:      unknown;
  result?:     unknown;
  $values?:    unknown;
}

function extractList(j: unknown): unknown[] {
  if (Array.isArray(j))              return j;
  const o = j as MaybeContainer | null;
  if (Array.isArray(o?.data))        return o!.data as unknown[];
  if (Array.isArray(o?.items))       return o!.items as unknown[];
  if (Array.isArray(o?.result))      return o!.result as unknown[];
  if (Array.isArray(o?.['$values'])) return o!['$values'] as unknown[];
  if (j && typeof j === 'object' && !Array.isArray(j)) return [j];
  return [];
}

function parseJsonCascade(text: string): unknown[] {
  const sanitized = sanitizeTextFields(text);   // sanitiza (antes: stripava)
  const s = sanitizeCtrl(sanitized);
  try { return extractList(JSON.parse(s)); } catch { /* fall through */ }
  const fixed = fixLiteralNewlines(s);
  try { return extractList(JSON.parse(fixed)); } catch { /* fall through */ }
  const quoted = escapeQuotesInFields(fixed);
  try { return extractList(JSON.parse(quoted)); } catch { /* fall through */ }
  return parseItemByItem(sanitized);            // fallback item-a-item
}

// ── Encoding ──────────────────────────────────────────────────────────────────

function decodeBytes(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    try {
      return new TextDecoder('iso-8859-1').decode(buffer);
    } catch {
      const arr = new Uint8Array(buffer);
      let s = '';
      for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
      return s;
    }
  }
}

// ── POST com retry ────────────────────────────────────────────────────────────

/** Resultado bruto de `dattagoPost` — array de items, falha temporária (null) ou permanente. */
export type DattagoPostResult = unknown[] | null | PermanentFailure;

/** Faz POST com retry exponencial. errorCap (opcional) recebe code+reason em caso de falha.
 *  - 429 / 5xx → backoff + retry (até 4 tentativas)
 *  - 4xx → falha permanente (sem retry)
 *  - parse vazio / HTML → retry */
export async function dattagoPost(
  endpoint: string,
  body: Record<string, unknown>,
  errorCap?: ErrorCap,
): Promise<DattagoPostResult> {
  const url = `${BASE}/${endpoint}/${UF}/${TENANT}`;
  const cap = (code: number, reason: string): void => {
    if (errorCap) Object.assign(errorCap, { code, reason });
  };

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const resp = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json-patch+json', 'accept': '*/*' },
        body:    JSON.stringify(body),
        signal:  AbortSignal.timeout?.(60_000),
      });

      if (resp.status === 429) {
        const retryAfter = parseInt(resp.headers.get('Retry-After') || '0', 10) || 0;
        const wait = Math.max(retryAfter * 1000, 2000 * attempt);
        if (attempt < 4) { await sleep(wait); continue; }
        cap(429, 'rate-limit'); return null;
      }

      if (resp.status >= 500) {
        if (attempt < 4) { await sleep(1500 * attempt); continue; }
        cap(resp.status, '5xx'); return null;
      }

      if (resp.status >= 400 && resp.status < 500) {
        cap(resp.status, '4xx'); return { items: null, permanent: true };
      }

      if (resp.status !== 200) {
        cap(resp.status, 'unexpected-status'); return null;
      }

      const bytes = await resp.arrayBuffer();
      const text  = decodeBytes(bytes);

      if (!text || text.trim() === 'null' || text.trim() === '[]' || text.trim() === '') return [];

      if (text.trimStart().startsWith('<')) {
        if (attempt < 4) { await sleep(3000 * attempt); continue; }
        cap(200, 'html-error'); return null;
      }

      const items = parseJsonCascade(text);

      if (items.length === 0 && text.length > 10) {
        if (attempt < 4) { await sleep(1000 * attempt); continue; }
        cap(200, 'parse-empty'); return null;
      }

      return items;

    } catch (err: unknown) {
      const e = err as { name?: string } | null;
      const isRetryable = e?.name === 'AbortError' || e?.name === 'TypeError';
      if (isRetryable && attempt < 4) { await sleep(1500 * attempt); continue; }
      cap(0, e?.name === 'AbortError' ? 'timeout' : 'network'); return null;
    }
  }
  cap(0, 'max-retries'); return null;
}

// ── Paginação automática ──────────────────────────────────────────────────────
//
// Busca todas as páginas via parâmetro `pagina` (1-indexed).
// getKey(item) → chave de dedup: se uma página não trouxer itens novos
// (pagina não suportado pela API ou última página), o loop encerra.
// TotalRegistros no 1º item — quando presente — serve como critério de parada.
// errorCap: objeto opcional { code, reason } repassado para dattagoPost — captura motivo da falha.
export async function fetchAllPages<TItem = unknown>(
  endpoint: string,
  params: Record<string, unknown>,
  getKey: (item: TItem) => string,
  label: string,
  onProgress?: ProgressCallback,
  errorCap?: ErrorCap,
): Promise<FetchAllPagesResult<TItem>> {
  const allItems: TItem[] = [];
  const seen     = new Set<string>();
  let page       = 1;
  let totalReg: number | null = null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    onProgress?.(
      `${label} — p.${page}` + (totalReg ? ` (${allItems.length}/${totalReg})` : ''),
    );

    // Página 1 sem parâmetro pagina — algumas APIs rejeitam parâmetros desconhecidos.
    // Páginas 2+ adicionam pagina=N para tentar buscar mais dados.
    const pageParams = page === 1 ? params : { ...params, pagina: page };
    const result     = await dattagoPost(endpoint, pageParams, errorCap);

    if (result === null) {
      return { items: allItems, failed: allItems.length === 0, permanent: false, totalReg };
    }
    if (result !== null && !Array.isArray(result) && (result as PermanentFailure).permanent) {
      return { items: allItems, failed: true, permanent: true, totalReg };
    }
    if (!Array.isArray(result) || result.length === 0) break;

    let newCount = 0;
    for (const item of result as TItem[]) {
      const k = getKey(item);
      if (!seen.has(k)) { seen.add(k); allItems.push(item); newCount++; }
    }

    if (newCount === 0) break; // pagina não suportado ou última página já deduplicada

    const first = result[0] as { TotalRegistros?: unknown } | undefined;
    if (totalReg === null && first?.TotalRegistros != null) {
      totalReg = Number(first.TotalRegistros);
    }

    if (totalReg !== null && allItems.length >= totalReg) break;
    if (page >= 500) {
      console.warn(`[${label ?? 'fetchAllPages'}] Limite de 500 páginas atingido — dados podem estar incompletos`);
      break; // limite de segurança
    }

    page++;
  }

  return { items: allItems, failed: false, permanent: false, totalReg };
}

// ── Pool de concorrência ──────────────────────────────────────────────────────

/** Função-task assíncrona sem retorno — falhas tratadas internamente. */
export type AsyncTask = () => Promise<void>;

/** Roda `tasks` com até `limit` workers em paralelo.
 *  stagger: delay inicial (ms) entre workers para evitar burst simultâneo. */
export async function concurrentPool(
  tasks: readonly AsyncTask[],
  limit: number,
  stagger = 0,
): Promise<void> {
  if (tasks.length === 0) return;
  let next = 0;
  async function worker(wi: number): Promise<void> {
    if (stagger > 0 && wi > 0) await sleep(Math.min(stagger * wi, 3000));
    while (next < tasks.length) {
      const i = next++;
      try { await tasks[i](); } catch { /* erros tratados dentro da task */ }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, (_, i) => worker(i)),
  );
}

export function calcCompleteness(rawByTask: ReadonlyArray<TaskResult | null>): number {
  const ok = rawByTask.filter(e => e && e.failed === false).length;
  return rawByTask.length > 0 ? ok / rawByTask.length : 0;
}

/** Retry infinito até 100% — falhas permanentes (4xx) não contam.
 *  Concorrência cai progressivamente (4→3→2→1) para aliviar pressão no servidor.
 *  Delay sobe até 30s para evitar rate-limit. */
export async function retryLoop(
  rawByTask: ReadonlyArray<TaskResult | null>,
  tasks: readonly AsyncTask[],
  label: string,
  onProgress: ProgressCallback | undefined,
  onOrgaoRef: OnOrgaoRef,
  log?: ImportLog,
): Promise<number> {
  const delays    = [1500, 3000, 6000, 10000, 15000];
  const MAX_DELAY = 30000;
  const concurrency = (round: number): number => Math.max(1, 4 - Math.min(round, 3));

  let round = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const failedIdxs = rawByTask.reduce<number[]>((acc, e, i) => {
      if ((!e || e.failed === true) && !(e?.permanent)) acc.push(i);
      return acc;
    }, []);
    if (failedIdxs.length === 0) break;

    const delay = delays[round] ?? MAX_DELAY;
    // Jitter ±20% para evitar thundering herd quando múltiplas APIs retentam simultaneamente
    const jittered = delay + Math.floor(Math.random() * (delay * 0.4));
    onProgress?.(`${label} — retentando ${failedIdxs.length} falha(s) [rodada ${round + 2}]...`);
    await sleep(jittered);

    const orig = onOrgaoRef.current;
    onOrgaoRef.current = (ev: OnOrgaoEvent): void => orig?.({ ...ev, isRetry: true });
    await concurrentPool(failedIdxs.map(i => tasks[i]), concurrency(round));
    onOrgaoRef.current = orig;

    round++;
    if (log) log.retryRounds = round;
  }

  return rawByTask.filter(e => e?.permanent === true).length;
}

// ── Cache localStorage ────────────────────────────────────────────────────────

export function cacheKey(id: string, params: Record<string, unknown>): string {
  return `despesaspmrv__dattago_${CACHE_VERSION}_${id}_${JSON.stringify(params)}`;
}

(function purgeStaleCaches(): void {
  const prefix    = 'despesaspmrv__dattago_';
  const validHead = `${prefix}${CACHE_VERSION}_`;
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(prefix) && !key.startsWith(validHead)) {
        localStorage.removeItem(key);
      }
    }
  } catch { /* localStorage indisponível — silenciar */ }
})();

/** Metadados gravados com o payload em `writeCache`. */
export interface CacheMeta {
  completeness?: number;
  taskCount?:    number;
  rowCount?:     number;
}

export function writeCache(key: string, data: unknown, meta: CacheMeta = {}): void {
  // Diferido: JSON.stringify de grandes datasets bloqueia o main thread
  // (congela animação do foguete e barras de progresso).
  setTimeout(() => {
    try {
      const json = JSON.stringify({ ts: Date.now(), data, meta });
      try {
        localStorage.setItem(key, json);
      } catch (e: unknown) {
        const err = e as { name?: string; code?: number } | null;
        if (err?.name === 'QuotaExceededError' || err?.code === 22) {
          console.warn(`[Cache] Armazenamento cheio — ${key} não cacheado (${(json.length / 1024).toFixed(0)} KB)`);
        }
      }
    } catch { /* serialização falhou — silenciar */ }
  }, 0);
}

export function readCache<T = unknown>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts, data, meta = {} } = JSON.parse(raw) as { ts: number; data: T; meta?: CacheMeta };
    if (Date.now() - ts > TTL_MS) { localStorage.removeItem(key); return null; }
    if ((meta.completeness ?? 0) < MIN_COMPLETENESS) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch { return null; }
}

export function hasValidCache(key: string): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const { ts, meta = {} } = JSON.parse(raw) as { ts: number; meta?: CacheMeta };
    return Date.now() - ts <= TTL_MS && (meta.completeness ?? 0) >= MIN_COMPLETENESS;
  } catch { return false; }
}
