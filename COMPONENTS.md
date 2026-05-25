# Components catalog

Navegue pelo código sem abrir arquivo por arquivo. Tudo em `src/`.

## 0. Routing Map — onde cada componente é renderizado

**Use isto antes de editar:** "qual rota usa este componente?" → resposta numa leitura.

### Rotas → Pages → Componentes

| Rota (hash) | Page | Componentes diretamente compostos |
|---|---|---|
| `/` | redirect → `/painel` | — |
| `/painel` | `pages/painel.tsx` | `TopBar` (breadcrumb), `PanelBanner` (hero gradient + actions), `KpiCard`×6 (com `Sparkline`), `FilterBar` (8 fields + `MultiSelectPopover` + `PeriodPopover`), `CombinedChart` (SVG-based, substitui Chart.js), `Demonstrativo` (bars-style), `DetailDrawer` (que monta `RowDetailDialog`×2) |
| `/empenhos` | `pages/table.tsx` (dataKey=enriched.empenhos) | `TopBar`, page-head, status tabs, `DataTable` (virtualize) |
| `/liquidacoes` | `pages/table.tsx` (dataKey=enriched.liquidacoes) | `TopBar`, page-head, `DataTable` (virtualize) |
| `/pagamentos` | `pages/table.tsx` (dataKey=enriched.pagamentos) | `TopBar`, page-head, `DataTable` (virtualize) |
| `/orcamento` | `pages/table.tsx` (dataKey=enriched.receita) | `TopBar`, page-head, `DataTable` (virtualize) |
| `/contratos` | `pages/table.tsx` (dataKey=enriched.contratos) | `TopBar`, page-head, `DataTable` (virtualize) |
| `/dattago` | `pages/dattago.tsx` | `TopBar`, page-head, `NativeSelect` (year picker), `Button`×2, `ApiStatusGrid`, `ImportHistory` |
| `*` | redirect → `/painel` | — |

### Componentes globais (montados fora do switch de rota)

| Componente | Onde monta | Cobre |
|---|---|---|
| `ThemeProvider` | `main.tsx` (root) | App inteiro |
| `AuthProvider` | `main.tsx` (root) | App inteiro |
| `RouterProvider` | `main.tsx` | Renderiza o router |
| `AppShell` | rota raiz `/` (Layout component) | Todas as rotas (renderiza `<Outlet/>` + Sidebar + Header) |
| `Sidebar` | `AppShell` (variants solid+translucent) | Todas as rotas |
| `Header` | `AppShell` (sticky top) | Todas as rotas |
| `ErrorBoundary` | wrappa cada rota individualmente (`router.tsx`) | Cada Page tem seu próprio (label = nome da Page) |

### Componentes → Rotas (índice reverso)

Para responder "se eu mudar X, qual rota é afetada?":

| Componente | Path | Usado nas rotas |
|---|---|---|
| `KpiCard` | `components/kpi-card.tsx` | `/painel` |
| `ChartBlock` | `components/chart-block.tsx` | `/painel` |
| `FilterBar` | `components/filter-bar.tsx` | `/painel` |
| `FilterCombobox` | `components/filter-combobox.tsx` | `/painel` (via FilterBar) |
| `DetailDrawer` | `components/detail-drawer.tsx` | `/painel` |
| `RowDetailDialog` | `components/row-detail-dialog.tsx` | `/painel` (via DetailDrawer) |
| `DataTable` | `components/data-table.tsx` | **TODAS** as 6 rotas de listagem (`/painel` sub-tabelas + 5 tabelas) |
| `ApiStatusGrid` | `components/api-status-grid.tsx` | `/dattago` |
| `ImportHistory` | `components/import-history.tsx` | `/dattago` |
| `NativeSelect` | `components/ui/native-select.tsx` | `/painel`, `/dattago` (+ filter-bar) |
| `ErrorBoundary` | `components/error-boundary.tsx` | **TODAS** (wrapper de rota) |
| `Sidebar` | `layouts/sidebar.tsx` | **TODAS** (global) |
| `Header` | `layouts/header.tsx` | **TODAS** (global) |
| `AppShell` | `layouts/app-shell.tsx` | **TODAS** (root layout) |
| `ThemeProvider` | `components/theme-provider.tsx` | **TODAS** (root) |
| `AuthProvider` | `components/auth-provider.tsx` | **TODAS** (root) |
| shadcn primitives (Button, Card, Sheet, etc.) | `components/ui/*` | múltiplas — buscar com grep se necessário |

### Regra ao editar

1. Achou o componente → consulta este mapa → sabe em quantas rotas o impacto vai ser sentido.
2. **TODAS** = mudança requer cuidado extra (cross-cutting).
3. Mudança visual? Teste light + dark.
4. Mudança de prop? Grep `<NomeDoComponente` em todo `src/` para atualizar callers.

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
| KpiCard | `kpi-card.tsx` | KPI card Dattago Moderno: label + delta-pill (mono), valor com font-size clamp, sparkline SVG inline full-width, trend line + sub | Skeleton, Sparkline, lucide |
| Sparkline | `sparkline.tsx` | Mini gráfico SVG inline com fill gradient + stroke + dot opcional. Usado em KpiCard. | — (SVG nativo) |
| CombinedChart | `combined-chart.tsx` | Gráfico SVG custom (substitui Chart.js): tabs diário/acumulado, scale dia/semana/mês, legend toggle, hover tooltip. ~85KB chunk vs 240KB do Chart.js. | useStore, formatCurrency |
| Demonstrativo | `demonstrativo.tsx` | Tabela bars-style: rank + nome + barra distribuição (3 sobrepostas) + valores mono + % exec + count. Switcher por dimensão. | useStore, formatCurrency |
| MultiSelectPopover | `multi-select-popover.tsx` | Popover com search, checkboxes, selectAll/clear, sort asc/desc, apply. | lucide |
| PeriodPopover | `period-popover.tsx` | Popover de período: quicks (Todo/Hoje/Semana/Mês), input de ano, grid de meses. Escreve direto no store. | useStore |
| DataTable | `data-table.tsx` | tabela genérica com sort/search/totals/export CSV. **2 modos**: `paginated` (50/pág, default) ou `virtualize` (scroll virtual via `@tanstack/react-virtual`, opt-in para datasets grandes) | Table, Input, Button, TanStack Table, TanStack Virtual |
| FilterBar | `filter-bar.tsx` | grid de 8 filtros do Painel (cascade) | FilterCombobox + `NativeSelect` interno |
| FilterCombobox | `filter-combobox.tsx` | popover + cmdk filtrável com item "Todos" | Popover, Command |
| DetailDrawer | `detail-drawer.tsx` | Sheet com 2 tabs (Empenhos + Gerencial) + RowDetailDialog | Sheet, Tabs, DataTable, RowDetailDialog |
| RowDetailDialog | `row-detail-dialog.tsx` | dialog com label/value de todas as colunas de uma linha | Dialog |
| ApiStatusGrid | `api-status-grid.tsx` | grid de 5 contadores por API (Emp/Liq/Pgto/Rec/Ctr) | — |
| ErrorBoundary | `error-boundary.tsx` | **class component** que captura throws de render. Console.group estruturado + UI amigável com "Tentar novamente"/"Recarregar". Cada rota envolve seu wrapper com `label`. | Card, Button, lucide |
| ImportHistory | `import-history.tsx` | tabela das últimas 20 importações persistidas em localStorage (observabilidade entre sessões). Lê de `lib/import-history.ts`. Re-le quando store sinaliza fim de import. | Card, Badge, lib/import-history |
| ThemeProvider | `theme-provider.tsx` | Context light/dark/system + `useTheme` hook | — (vanilla React) |
| AuthProvider | `auth-provider.tsx` | `<AuthProvider>` + `useAuth()` + `<RequireAuth role?>`. **Placeholder** hoje (sempre logado como "Anônimo"). Plug real auth substituindo o `value` do context. | — (vanilla React) |
| PanelBanner | `panel-banner.tsx` | Hero banner Dattago Moderno: gradient diagonal + grid pattern (mask radial) + título accent + actions (theme toggle + refresh). Usado no topo da PainelPage. | useTheme, lucide |
| StatusBadge | `status-badge.tsx` | Pílula colorida pra status (Pago/Liquidado/Empenhado/Anulado/Retido) — 5 cores mapeadas. | lucide |

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
| AppShell | `app-shell.tsx` | Grid `.app` (260px sidebar / 64px collapsed). Sidebar sticky + main com radial bg. `useAutoImport`. Estado collapsed local. |
| Sidebar | `sidebar.tsx` | Replica fiel do design: brand-mark SVG triangle + brand-pulse, nav items com badge + rail, section "Documentos", footer com exercise-card + ghost-btn (theme + collapse). |
| TopBar | `topbar.tsx` | Dentro de cada Page (não no AppShell). Breadcrumb + busca global com `⌘K` + bell + user-chip. Render no topo via margem negativa do `.topbar`. |

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
| `locale.ts` | `LocaleConfig` (id, currency, months), `getCurrentLocale()`, `formatCurrency`, `formatPercent`, `formatShort`, `getMonthName(m)`, `compareLocale(a,b)`. Hoje: pt-BR. Adicionar idioma = 1 entry em `LOCALES`. |

## 6.5. Config — `src/config/`

| Path | Conteúdo |
|---|---|
| `tenant.ts` | `TenantConfig` interface, `RIO_VERDE_GO` instance, `TENANTS` registry, `getCurrentTenant()`, `listTenants()`. Resolve tenant via env `VITE_TENANT_ID` (default: rioverde). |

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
