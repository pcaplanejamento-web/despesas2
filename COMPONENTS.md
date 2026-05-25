# Components catalog

Navegue pelo código sem abrir arquivo por arquivo. Tudo em `src/`.

## 1. UI primitives — `src/components/ui/`

shadcn New York. 17 arquivos. Wrappers finos sobre Radix + `cn()`.

| Nome | Path | Propósito | Radix |
|---|---|---|---|
| Badge | `ui/badge.tsx` | label colorido (cva) | — |
| Button | `ui/button.tsx` | botão com 6 variants + 4 sizes (cva) | Slot |
| Card | `ui/card.tsx` | wrapper + Header/Title/Description/Content/Footer | — |
| Checkbox | `ui/checkbox.tsx` | checkbox controlado | Checkbox |
| Command | `ui/command.tsx` | command palette (busca filtrável) | cmdk |
| Dialog | `ui/dialog.tsx` | modal centrado | Dialog |
| DropdownMenu | `ui/dropdown-menu.tsx` | menu suspenso (theme switcher) | DropdownMenu |
| EmptyState | `ui/empty-state.tsx` | placeholder com ícone + title + ação | — |
| Input | `ui/input.tsx` | text input estilizado | — |
| Popover | `ui/popover.tsx` | container flutuante | Popover |
| Separator | `ui/separator.tsx` | linha horizontal/vertical | Separator |
| Sheet | `ui/sheet.tsx` | drawer lateral (4 sides + 3 widths) | Dialog |
| Skeleton | `ui/skeleton.tsx` | placeholder loading animado | — |
| Spinner | `ui/spinner.tsx` | Loader2 com 3 sizes (cva) | — |
| Table | `ui/table.tsx` | wrappers semânticos `<table>` shadcn | — |
| Tabs | `ui/tabs.tsx` | TabsList/TabsTrigger/TabsContent | Tabs |
| Tooltip | `ui/tooltip.tsx` | tooltip nativo Radix | Tooltip |

## 2. Components — `src/components/`

Compostos sobre os primitives. Puros (props in → JSX out).

| Nome | Path | Propósito | Usa |
|---|---|---|---|
| KpiCard | `kpi-card.tsx` | card de KPI com gradient + ícone + valor monetário + click handler | Card, Skeleton, lucide |
| ChartBlock | `chart-block.tsx` | wrapper Card + Tabs (diário/mensal) + chart children | Card, Tabs |
| DataTable | `data-table.tsx` | tabela genérica com sort/search/totals/export CSV. **2 modos**: `paginated` (50/pág, default) ou `virtualize` (scroll virtual via `@tanstack/react-virtual`, opt-in para datasets grandes) | Table, Input, Button, TanStack Table, TanStack Virtual |
| FilterBar | `filter-bar.tsx` | grid de 8 filtros do Painel (cascade) | FilterCombobox + `NativeSelect` interno |
| FilterCombobox | `filter-combobox.tsx` | popover + cmdk filtrável com item "Todos" | Popover, Command |
| DetailDrawer | `detail-drawer.tsx` | Sheet com 2 tabs (Empenhos + Gerencial) + RowDetailDialog | Sheet, Tabs, DataTable, RowDetailDialog |
| RowDetailDialog | `row-detail-dialog.tsx` | dialog com label/value de todas as colunas de uma linha | Dialog |
| ApiStatusGrid | `api-status-grid.tsx` | grid de 5 contadores por API (Emp/Liq/Pgto/Rec/Ctr) | — |
| ErrorBoundary | `error-boundary.tsx` | **class component** que captura throws de render. Console.group estruturado + UI amigável com "Tentar novamente"/"Recarregar". Cada rota envolve seu wrapper com `label`. | Card, Button, lucide |
| ImportHistory | `import-history.tsx` | tabela das últimas 20 importações persistidas em localStorage (observabilidade entre sessões). Lê de `lib/import-history.ts`. Re-le quando store sinaliza fim de import. | Card, Badge, lib/import-history |
| ThemeProvider | `theme-provider.tsx` | Context light/dark/system + `useTheme` hook | — (vanilla React) |

## 3. Hooks — `src/hooks/`

| Nome | Retorna | Depende de |
|---|---|---|
| `usePainelData()` | `{ empRows, liqRows, pgtoRows, kpis, mensal, diario, ...grouped, contratos }` filtrados+memoizados | store (painel/indexes/filters), `lib/compute` |
| `useImportDattago()` | `{ state, run(year), reset() }` — orquestra fetch + enrich + store write + record history | services Dattago + `lib/enrichment` + `lib/import-history` + store |
| `useAutoImport()` | void | `useImportDattago`, store. Roda 1× no mount, importa ano corrente |
| `useChartData(tipo, mode, diario, mensal)` | `{ data, options }` p/ Chart.js. Re-resolve cores via `getComputedStyle` quando `resolvedTheme` muda | `useTheme`, `lib/compute` types |

## 4. Layouts — `src/layouts/`

| Nome | Path | Composição |
|---|---|---|
| AppShell | `app-shell.tsx` | Sidebar (solid desktop / translucent mobile via Sheet manual) + Header + `<Outlet />`. Dispara `useAutoImport`. |
| Sidebar | `sidebar.tsx` | brand + nav (7 links via NavLink) + footer. Variant `solid` / `translucent`. `NAV_ITEMS` array. |
| Header | `header.tsx` | título da rota + status + DropdownMenu tema (light/dark/system). Lê `useStore(s => s.ui.headerStatus)`. |

## 5. Pages — `src/pages/`

| Nome | Path | Rota(s) |
|---|---|---|
| PainelPage | `painel.tsx` | `/painel` — KPIs (6) + 2 ChartBlocks + Demonstrativo unificado + DetailDrawer |
| TablePage | `table.tsx` | `/empenhos` `/liquidacoes` `/pagamentos` `/orcamento` `/contratos` — parametrizada por `dataKey` |
| DattagoPage | `dattago.tsx` | `/dattago` — controles de import + status + anos carregados |

## 6. Lib — `src/lib/`

Funções puras. Sem DOM (exceto `import-history`). Sem store.

| Path | Conteúdo |
|---|---|
| `utils.ts` | `cn(...)` — clsx + tailwind-merge |
| `config.ts` | `MESES`, `SECTION_TITLES`, `formatCurrency`, `formatPercent`, `formatShort`, `truncateLabel`, `escHtml`, `normalizeSearch`, `compareValues`, `PAGE_SIZE=50` |
| `compute.ts` | Tipos `EmpRow/LiqRow/PgtoRow/RecRow/CtrRow`, índices `CE/CL/CP`, `DimensaoEmp`, `parseDDMMYYYY`, `buildDimFilter`, `getUnidades`, `filterByPeriodo/Unidade/Elemento/Acao/Contrato/Licit/Credor/Visao`, `computeKpis`, `computeAllGrouped`, `computeByContrato`, `computeDiario`, `computeMensal`, `buildPagoByDate`, `recomputeAcumulado` |
| `enrichment.ts` | `enrichPgtoRows`, `enrichLiqRows`, `enrichCtrRows`, `enrichEmpWithContrato`. Joins por NumEmpenho. Classifica `Tipo` (RESTO A PAGAR / NOTA DE EMPENHO / ERRO). |
| `kpis.ts` | `KPI_DEFS` (definições dos 6 cards) + tipos `KpiKey/KpiGradient/KpiDef`. |
| `import-history.ts` | `readImportHistory()`, `recordImportHistory(entry)`, `clearImportHistory()`, `formatDuration(ms)`. Persiste em `localStorage["dattago_import_history_v1"]`, mantém últimas 20. |

## 7. Services — `src/services/`

| Path | Função |
|---|---|
| `dattago-core.ts` | `ORGAOS`, `ORGAOS_BLOQUEADOS`, `isOrgaoBloqueado`, `ImportLog`, `dattagoPost`, `fetchAllPages`, `concurrentPool`, `retryLoop`, `cacheKey`, `readCache`, `writeCache`, `hasValidCache`, `monthlyChunks`, `getImportDateRange`, `fMoney`, `normDate`, constantes `CACHE_VERSION='v12'`, `TTL_MS=15min`, `CONCURRENCY/HEAVY/LIGHT` |
| `dattago-empenhos.ts` | `getEmpenhos(year)` — fase 1 chunk único + fase 2 fallback mensal |
| `dattago-liquidacoes.ts` | `getLiquidacoes(year)` — HEAVY 3 workers, stagger 200ms, por órgão |
| `dattago-pagamentos.ts` | `getPagamentos(year)` — chunk único `{ ano: year }` |
| `dattago-receita.ts` | `getReceita(year)` — HEAVY 3 workers, por órgão |
| `dattago-contratos.ts` | `getContratos(year)` — LIGHT 5 workers, por órgão |
| `dattago-api.ts` | barrel re-export + `clearDattagoCache` + `isDattagoCached` |

## 8. Store — `src/store/index.ts`

Single Zustand store, sem middleware. Shape em 4 slices:

```ts
filters: { visao, demonstrativo, periodo, unidade, elemento, acao, contrato, credor, licit }
data:    { loadedYears: Set<number>,
           enriched: { empenhos, liquidacoes, pagamentos, receita, contratos },
           painel:   { emp, liq, pgto },                  // sem RESTO A PAGAR
           rap:      { liq, pgto },                       // só RESTO A PAGAR
           indexes:  { empContratoMap } }
ui:      { headerStatus, importing }
charts:  { barras{mode}, linha{mode} }
```

Actions: `setVisao`, `setDemonstrativo`, `setPeriodo`, `setFilter`, `appendEnriched`, `setEmpContratoMap`, `addLoadedYear`, `resetData`, `setHeaderStatus`, `setImporting`, `setChartMode`.

**Princípios:**
- Derivados (KPIs, mensal, etc.) **não ficam no store** — computados em `usePainelData` via `useMemo` (evita staleness).
- `initialData()` é factory (não objeto compartilhado) — `resetData` cria refs novas.
- Actions são referências estáveis (seguro em `useCallback` deps).
- Seletores multi-prop usam `useShallow` (de `zustand/shallow`).
- `loadedYears` lido via `useStore.getState()` quando só serve de guard.
