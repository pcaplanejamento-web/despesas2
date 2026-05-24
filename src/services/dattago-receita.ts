// dattago-receita.ts — importação da API Receita Orçamentária (ObterReceitaOrcamentariaDetalhada)
//
// Port de assets/js/services/dattago-receita.js (V3 — Service Layer).
//
// NÃO possui TotalRegistros; sem validação de contagem.
// NÃO usa intervalo de datas: parâmetro é { orgao, ano }.
// Paginação: por órgão apenas (19 tasks por ano).
// Dedup: por Id (se presente); fallback composto (orgao + CodigoElemento + Data + Fornecedor).
//
// Estratégia: CONCURRENCY_HEAVY (3 tasks simultâneas) com stagger 200ms.
// API mais volumosa (33K registros), principal fonte de HTTP 429.

import {
  ORGAOS, CONCURRENCY_HEAVY,
  normDate, fMoney, str,
  dattagoPost, concurrentPool, calcCompleteness, retryLoop,
  writeCache, readCache, cacheKey,
  isOrgaoBloqueado, ImportLog,
} from './dattago-core';
import type { RecRow } from '@/lib/compute';
import type {
  Orgao, OnOrgaoCallback, OnOrgaoRef, ProgressCallback, TaskResult, AsyncTask,
  PermanentFailure,
} from './dattago-core';
import type { DattagoApiResult } from './dattago-empenhos';

/** Forma bruta de um item da API ObterReceitaOrcamentariaDetalhada. */
interface RawReceita {
  Id?:                 number | string | null;
  id?:                 number | string | null;
  Data?:               string | null;
  CodigoElemento?:     string | null;
  Codigo?:             string | null;
  DescricaoElemento?:  string | null;
  Descricao?:          string | null;
  DescricaoFonte?:     string | null;
  Fonte?:              string | null;
  DescricaoDestinacao?: string | null;
  Destinacao?:         string | null;
  Valor?:              string | number | null;
  ValorFinal?:         string | number | null;
  ValorArrecadado?:    string | number | null;
  ValorRealizado?:     string | number | null;
  Observacao?:         string | null;
  Fornecedor?:         string | null;
  Contribuinte?:       string | null;
}

function mapReceita(item: RawReceita, orgao: Orgao): RecRow {
  return [
    normDate(item.Data),
    orgao.nome,
    str(item.CodigoElemento    ?? item.Codigo        ?? ''),
    str(item.DescricaoElemento ?? item.Descricao     ?? ''),
    str(item.DescricaoFonte    ?? item.Fonte         ?? ''),
    str(item.DescricaoDestinacao ?? item.Destinacao  ?? ''),
    fMoney(item.Valor),
    fMoney(item.ValorFinal ?? item.ValorArrecadado ?? item.ValorRealizado ?? 0),
    str(item.Observacao    ?? ''),
    str(item.Fornecedor    ?? item.Contribuinte    ?? ''),
  ];
}

export async function getReceita(
  ano: number,
  onProgress?: ProgressCallback,
  onOrgao?: OnOrgaoCallback,
): Promise<DattagoApiResult<RecRow>> {
  const key    = cacheKey('rec', { ano });
  const cached = readCache<RecRow[]>(key);
  if (cached) {
    onOrgao?.({ api: 'rec', fromCache: true, count: cached.length });
    return { rows: cached, completeness: 1.0, taskCount: 0, log: null };
  }

  const log       = new ImportLog('Orçamento', 'ObterReceitaOrcamentariaDetalhada');
  log.dateRange   = String(ano);
  log.taskCount   = ORGAOS.length;

  const rawByTask: Array<TaskResult<RawReceita> | null> = new Array(ORGAOS.length).fill(null);
  const onOrgaoRef: OnOrgaoRef = { current: onOrgao };

  const tasks: AsyncTask[] = ORGAOS.map((orgao, oi) => async () => {
    onProgress?.(`Orcamento — ${ano} · orgao ${oi + 1}/${ORGAOS.length}`);
    const cap: { code?: number; reason?: string } = {};
    const result = await dattagoPost('ObterReceitaOrcamentariaDetalhada', { orgao: orgao.id, ano }, cap);
    const failed    = result === null || !!(result as PermanentFailure | null)?.permanent;
    const permanent = !!(result as PermanentFailure | null)?.permanent;
    if (failed) {
      rawByTask[oi] = { orgao, items: [], failed: true, permanent };
      onOrgaoRef.current?.({ api: 'rec', monthLabel: null, orgao, orgaoIdx: oi, count: 0, error: true, errorCode: cap.code, errorReason: cap.reason });
    } else {
      const items = result as RawReceita[];
      rawByTask[oi] = { orgao, items, failed: false };
      onOrgaoRef.current?.({ api: 'rec', monthLabel: null, orgao, orgaoIdx: oi, count: items.length, error: false });
    }
  });

  // HEAVY: 3 workers simultâneos com stagger de 200ms — API mais volumosa, reduz burst de 429s
  await concurrentPool(tasks, CONCURRENCY_HEAVY, 200);
  await retryLoop(rawByTask, tasks, 'Orcamento', onProgress, onOrgaoRef, log);

  const seen = new Set<string>();
  const rows: RecRow[] = [];
  for (const entry of rawByTask) {
    if (!entry || !entry.orgao) continue;
    for (const item of entry.items) {
      const id = str(item.Id ?? item.id ?? '');
      const k  = id || `${entry.orgao.id}|${str(item.CodigoElemento)}|${normDate(item.Data)}|${str(item.Fornecedor ?? item.Contribuinte)}`;
      if (seen.has(k)) continue;
      if (isOrgaoBloqueado(entry.orgao.nome)) continue;
      seen.add(k);
      rows.push(mapReceita(item, entry.orgao));
    }
  }

  log.rawCount      = rawByTask.reduce((s, e) => s + (e?.items?.length ?? 0), 0);
  log.tasksFailed   = rawByTask.filter(e => e?.permanent === true).length;
  log.importedCount = rows.length;
  const completeness = calcCompleteness(rawByTask);
  log.finish(completeness);

  if (completeness >= 1.0) {
    writeCache(key, rows, { completeness, taskCount: log.taskCount, rowCount: rows.length });
  }
  return { rows, completeness, taskCount: log.taskCount, log };
}
