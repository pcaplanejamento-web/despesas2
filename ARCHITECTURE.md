# Architecture

Dattago — SPA estática de visualização de despesas municipais (PMRV Rio Verde · GO).

## 1. Stack

| Camada | Tecnologia |
|---|---|
| Build | Vite 8 + TypeScript 6 strict |
| UI | React 19 + Tailwind 4 + shadcn (New York) |
| State | Zustand 5 + `subscribeWithSelector` |
| Roteamento | React Router 6 (`createHashRouter`) |
| Tabelas | TanStack Table 8 |
| Charts | Chart.js 4 + react-chartjs-2 |
| Icons | lucide-react |
| Search/combobox | cmdk + Radix Popover |
| Primitives | Radix UI (dialog, dropdown, popover, separator, slot, tabs, tooltip, checkbox) |
| Datas | date-fns 4 |
| Tipografia | Geist Sans + Geist Mono (Google Fonts) |

`package.json` é a fonte de verdade. Nenhum framework SSR/SSG — bundle 100% client-side.

## 2. Estrutura de pastas

```
dattago/
├── .github/workflows/deploy.yml   # Pages CI
├── public/
│   ├── foguete.svg                # logo + favicon
│   └── logo.svg
├── index.html                     # entry HTML (preload Geist, dark-flash guard)
├── src/
│   ├── main.tsx                   # createRoot + ThemeProvider + RouterProvider
│   ├── router.tsx                 # 7 rotas via createHashRouter
│   ├── index.css                  # @theme + tokens oklch + dark variant
│   ├── components/                # KpiCard, ChartBlock, DataTable, FilterBar...
│   │   └── ui/                    # shadcn primitives (17)
│   ├── hooks/                     # use-painel-data, use-import-dattago, use-auto-import
│   ├── layouts/                   # AppShell, Sidebar, Header
│   ├── lib/                       # compute, config, enrichment, kpis, utils
│   ├── pages/                     # PainelPage, TablePage, DattagoPage
│   ├── services/                  # dattago-core + 5 fetchers + barrel api
│   └── store/index.ts             # Zustand store (filters/data/ui/charts)
├── components.json                # shadcn config (style=new-york, zinc, lucide)
├── vite.config.ts                 # base '/dattago/' + alias '@' → src
└── tsconfig.json
```

## 3. Camadas e fluxo de dados

```
                                 [usuário]
                                     |
                                     v
+--------+   +------+   +---------+   +---------+   +------------+   +-------+   +--------+
|services|-->| lib  |-->|  store  |-->|  hooks  |-->| components |-->| pages |-->| router |
+--------+   +------+   +---------+   +---------+   +------------+   +-------+   +--------+
   |             |          ^             ^                                          ^
   |             |          |             |                                          |
   |             |     appendEnriched     |                                          |
   |             |     setDerived         |                                          |
   |             +---- enrichment --------+                                          |
   |                  + compute                                                      |
   v                                                                                 |
[Cloudflare Worker centi-proxy → API Vie Dattago] <----- 5 endpoints em paralelo ----+
```

- `services/*` → Promise.allSettled de 5 APIs com cache localStorage + retry exponencial.
- `lib/enrichment.ts` cruza empenhos × liquidações × pagamentos × contratos.
- `lib/compute.ts` aplica filtros e gera KPIs / mensal / diário / grouped.
- `store/index.ts` segura `filters` (input do usuário) + `data` (raw + enriched + derived).
- `hooks/use-painel-data.ts` é o pipeline reativo do Painel; `use-import-dattago.ts` orquestra import.
- `components/*` são puros (props in → JSX out). `pages/*` compõem componentes.

## 4. Roteamento

`src/router.tsx` usa `createHashRouter` (URLs `#/painel` etc.) para funcionar em GitHub Pages sub-path sem 404.html.

Pages são **lazy-loaded** via `React.lazy` + `<Suspense fallback={<PageFallback />}>` para code-splitting:
- `painel` isola Chart.js + react-chartjs-2 (~240 KB → 80 KB gzip).
- `table` isola @tanstack/react-table + @tanstack/react-virtual (~78 KB → 21 KB gzip), compartilhado pelas 5 rotas.
- `dattago` chunk próprio (~8 KB, inclui ImportHistory).
- Bundle inicial: ~423 KB → 135 KB gzip (sem aviso `>500KB`).

Cada rota é envolvida por um `<ErrorBoundary label="…">` próprio — isola crashes:
um throw no Painel não derruba a Sidebar/Header, e o user vê UI amigável com
botão "Tentar novamente".

| Path | Page | Função |
|---|---|---|
| `/` | redirect → `/painel` | — |
| `/painel` | `PainelPage` | KPIs + Charts + Demonstrativo |
| `/empenhos` | `TablePage dataKey="enriched.empenhos"` | tabela empenhos |
| `/liquidacoes` | `TablePage dataKey="enriched.liquidacoes"` | tabela liquidações |
| `/pagamentos` | `TablePage dataKey="enriched.pagamentos"` | tabela pagamentos |
| `/orcamento` | `TablePage dataKey="enriched.receita"` | tabela orçamento |
| `/contratos` | `TablePage dataKey="enriched.contratos"` | tabela contratos |
| `/dattago` | `DattagoPage` | importação manual |
| `*` | redirect → `/painel` | catch-all |

`AppShell` envolve todas as rotas com Sidebar + Header + `<Outlet />`.

## 5. State (Zustand)

`src/store/index.ts` — single store via `create()`. Sem middleware extra (não há `.subscribe()` consumer).

```
AppStore
├── filters: FiltersSlice   { visao, demonstrativo, periodo, unidade, elemento, acao, contrato, credor, licit }
├── data:    DataSlice      { loadedYears, enriched, painel, rap, indexes }
├── ui:      UiSlice        { headerStatus, importing }
└── charts:  ChartsSlice    { barras{mode}, linha{mode} }
```

Actions: `setVisao`, `setDemonstrativo`, `setPeriodo`, `setFilter`, `appendEnriched`, `setEmpContratoMap`, `addLoadedYear`, `resetData`, `setImporting`, `setHeaderStatus`, `setChartMode`.

**Princípios:**
- Derivados (KPIs, mensal, diário, grouped) são computados em `usePainelData` via `useMemo` — **não ficam no store** pra evitar staleness.
- `initialData()` é factory (não objeto compartilhado) — `resetData` sempre cria refs novas.
- Actions Zustand são referências estáveis — seguro usar em `useCallback` deps sem causar re-renders.
- Seletores multi-prop usam `useShallow` (de `zustand/shallow`).
- `loadedYears` é lido via `useStore.getState()` dentro de `useCallback` quando só serve como guard, evitando re-criar a callback a cada import.

## 6. Service Layer

`src/services/` — 7 arquivos.

- `dattago-core.ts` — utilitários compartilhados (cache `CACHE_VERSION=v12`, parsers JSON, HTTP, pool, retry, lista `ORGAOS_BLOQUEADOS`).
- `dattago-empenhos.ts`, `dattago-liquidacoes.ts`, `dattago-pagamentos.ts`, `dattago-receita.ts`, `dattago-contratos.ts` — um por endpoint.
- `dattago-api.ts` — barrel re-export + `clearDattagoCache` + `isDattagoCached`.

**5 endpoints em paralelo** via `Promise.allSettled` (1 falha não bloqueia o resto).
**Concorrência adaptativa**: `CONCURRENCY=6` padrão, `CONCURRENCY_HEAVY=3` (Liquidações + Receita), `CONCURRENCY_LIGHT=5` (Contratos).
**Cache localStorage**: chave `despesaspmrv__dattago_v12_*`, TTL 15 min, `MIN_COMPLETENESS=1.0`. Cache antigo (versão ≠ v12) é purgado no boot.

Worker URL: `https://centi-proxy.pcaplanejamento.workers.dev/portal/{endpoint}/go/rioverde` — única referência ao termo "Centi" permitida no projeto (nome legacy do Cloudflare Worker em produção).

Filtro `ORGAOS_BLOQUEADOS` (IPARV ASSIS, IPARV PREVI, FESURV, Câmara) é aplicado em todos os fetchers, **antes** do cache.

## 7. Design system

Estilo shadcn New York (Vercel / v0 / Linear).

- Tokens semânticos em `src/index.css` `:root` + `.dark` — paleta **zinc** em oklch.
- `--radius: 0.5rem` (cards, buttons, inputs).
- Dark mode via classe `.dark` no `<html>` — controlado por `ThemeProvider`.
- Tipografia: Geist Sans + Geist Mono via Google Fonts (preload em `index.html`).
- Ícones: lucide-react (`size-3.5` / `size-4` para inline; `size-5` para destaque).
- Sidebar tem token próprio (`--sidebar*`) — variantes `solid` (desktop) / `translucent` (mobile com backdrop-blur).
- Script anti-FOUC inline no `<head>` lê `localStorage["vega-theme"]` antes do paint.

## 8. Observabilidade

- **`ImportLog`** (em `dattago-core.ts`) — por API, por execução: `taskCount`, `tasksOk`, `tasksFailed`, `retryRounds`, `elapsedMs`, `inconsistencies`, `recoveredItems`.
- **`onOrgao`** callback — evento por unidade processada (count, error code, retry, fromCache).
- **`headerStatus`** (no store) — texto reativo na barra de header durante import.
- **`ImportHistory`** (`src/lib/import-history.ts` + componente `import-history.tsx`) — persistência das últimas 20 execuções em localStorage: timestamp, duração, ano, totais por API, status, error. Exibido na DattagoPage (`Card 4`).
- **`ErrorBoundary`** (`src/components/error-boundary.tsx`) — captura throws de render, console.group estruturado + UI amigável. Wrapper em cada rota.

## 9. Performance

- **Bundle**: ~423 KB inicial (135 KB gzip), code-split por rota via `React.lazy`.
- **Computações memoizadas**: pipeline em `usePainelData` via `useMemo`; `useShallow` em seletores multi-prop.
- **Tabelas**:
  - Modo `paginated` (default, 50/pág) — usado nas sub-tabelas do Painel.
  - Modo `virtualize` (opt-in) — usado nas 5 rotas de tabela. Usa `@tanstack/react-virtual` p/ renderizar só linhas visíveis em scroll. Suporta 30k+ rows sem travar.

## 10. Deploy

- Workflow: `.github/workflows/deploy.yml` — `actions/checkout@v4` → `setup-node@v4` (Node 20) → `npm ci` → `npm run build` → `upload-pages-artifact` → `deploy-pages@v4`.
- Trigger: push em `main` + `workflow_dispatch`.
- `vite.config.ts` define `base: '/dattago/'`.
- URL produção: <https://pcaplanejamento-web.github.io/dattago/>.
- Concurrency group `pages` evita deploys sobrepostos.
