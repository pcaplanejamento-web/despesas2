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

`src/store/index.ts` — single store via `create()` + `subscribeWithSelector`.

```
AppStore
├── filters: FiltersSlice   { visao, demonstrativo, periodo, unidade, elemento, acao, contrato, credor, licit }
├── data:    DataSlice      { loadedYears, enriched, painel, rap, indexes, derived }
├── ui:      UiSlice        { activeRoute, headerStatus, importing }
└── charts:  ChartsSlice    { barras{mode,yMax}, linha{mode,yMax}, active }
```

Actions principais: `setVisao`, `setDemonstrativo`, `setPeriodo`, `setFilter`, `appendEnriched`, `setEmpContratoMap`, `addLoadedYear`, `setDerived`, `resetData`, `setImporting`, `setHeaderStatus`, `setChartMode`.

Seletores usam `useShallow` para reduzir re-renders.

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

## 8. Deploy

- Workflow: `.github/workflows/deploy.yml` — `actions/checkout@v4` → `setup-node@v4` (Node 20) → `npm ci` → `npm run build` → `upload-pages-artifact` → `deploy-pages@v4`.
- Trigger: push em `main` + `workflow_dispatch`.
- `vite.config.ts` define `base: '/dattago/'`.
- URL produção: <https://pcaplanejamento-web.github.io/dattago/>.
- Concurrency group `pages` evita deploys sobrepostos.
