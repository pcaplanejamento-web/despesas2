# Dattago

> Painel de visualização de despesas do município de Rio Verde · GO (PMRV). Importa dados públicos da API Dattago em tempo real, com paridade visual ao estilo Vercel / v0 / Linear.

🚀 **Produção**: <https://pcaplanejamento-web.github.io/dattago/>

## Stack

- **React 19** + **Vite 8** + **TypeScript** (strict mode + project references)
- **Tailwind CSS 4** + tokens **shadcn** (New York, zinc, radius 0.5rem)
- **Zustand 5** (state) · **React Router 6** (hash mode, code-split)
- **Chart.js 4** + react-chartjs-2 · **@tanstack/react-table 8** + **react-virtual 3**
- **lucide-react** (ícones) · **date-fns** (datas) · **cmdk** (command palette)
- **vitest** (tests · 56 passando) · **ESLint** (flat config)

Design system: estilo Vercel/v0/Linear — minimalista, paleta neutra, accent único, sombras sutis, sidebar sólida/translúcida.

## Estrutura

```
src/
  config/
    tenant.ts        # Multi-tenant (TenantConfig + registry; VITE_TENANT_ID env)
  components/
    ui/              # shadcn primitives (17 arquivos — button, card, table, sheet…)
    data-table.tsx   # Tabela genérica c/ 2 modos: paginated + virtualize
    kpi-card.tsx · chart-block.tsx · filter-bar.tsx · filter-combobox.tsx
    detail-drawer.tsx · row-detail-dialog.tsx
    error-boundary.tsx     # captura throws de render, fallback amigável
    auth-provider.tsx      # AuthProvider + useAuth + RequireAuth (placeholder)
    import-history.tsx     # tabela das últimas 20 execuções
    api-status-grid.tsx
    theme-provider.tsx
  hooks/
    use-painel-data.ts · use-import-dattago.ts · use-auto-import.ts · use-chart-data.ts
  layouts/           # app-shell, sidebar, header
  lib/
    compute.ts       # tipos + filters + KPIs (pure)
    enrichment.ts    # joins entre empenhos/liquidações/pagamentos/contratos
    locale.ts        # i18n (LocaleConfig + registry; VITE_LOCALE_ID env)
    config.ts        # constantes + re-export de locale
    import-history.ts · utils.ts · kpis.ts
  pages/             # painel, table (param x5), dattago
  services/          # dattago-api + 5 endpoints + core (retry, cache, concurrency)
  store/             # Zustand (filters/data/ui/charts)
  router.tsx         # 7 rotas lazy + ErrorBoundary por rota
  main.tsx           # ThemeProvider + AuthProvider + RouterProvider
```

> **Mapa detalhado**: [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`COMPONENTS.md`](./COMPONENTS.md) (routing map) · [`MAINTENANCE.md`](./MAINTENANCE.md) (16 receitas).

## Scripts

```bash
npm install        # deps
npm run dev        # localhost:5173/dattago/ (HMR)
npm run build      # dist/ produção (tsc -b + vite build)
npm run preview    # serve dist localmente
npm test           # vitest run (CI)
npm run test:watch # vitest watch
npm run test:ui    # vitest UI
npm run lint       # eslint
```

## Princípios não-negociáveis

1. **Modularização absoluta** — cada feature em arquivo próprio
2. **Sistema multi-páginas** — rota = unidade, lazy-loaded
3. **100 % orientado a componentes + services** — zero lógica solta
4. **Componentização real** — DataTable, KpiCard, FilterCombobox genéricos
5. **Padronização absoluta** — mesma forma de fazer a mesma coisa
6. **Reuso > criação** — checar `COMPONENTS.md` antes de criar
7. **CI/CD** — push em main = deploy auto
8. **Design System manipulável** — tokens em `index.css`, troca palette em 1 lugar
9. **Observabilidade** — ImportLog + ImportHistory + ErrorBoundary
10. **Lazy Loading** — `React.lazy` por rota, virtualização DataTable
11. **Service Layer** — `services/dattago-*` isola I/O
12. **State Management** — Zustand slices, derivados em `useMemo` (nunca no store)
13. **Performance absoluta** — bundle 135 KB gzip inicial, virtualização 30k+ rows
14. **Manutenção fácil** — `.md` sempre atualizado no mesmo commit
15. **Economia de tokens** — IA encontra reuse via `COMPONENTS.md`, sem grep cego
16. **Escalabilidade absoluta** — multi-tenant + i18n + auth + tests pavimentados

## Recursos-chave

### Importação de dados

5 endpoints da API Dattago (via Cloudflare Worker `centi-proxy.pcaplanejamento.workers.dev` — única exceção ao banimento de "Centi"):
**Empenhos** · **Liquidações** · **Pagamentos** · **Receita** · **Contratos**

Fetch em paralelo via `Promise.allSettled` com concorrência calibrada:
- HEAVY (3 workers, stagger 200ms) — Liquidações + Receita
- LIGHT (5 workers) — Contratos
- Retry loop até completeness 100 % (delays 1.5s → 30s, jitter ±20 %)
- 4xx = falha permanente (sem retry); 429 respeita `Retry-After`

### Cache

`localStorage` com TTL 15 min e `CACHE_VERSION='v12'` (bump = invalida tudo automático). Histórico das últimas 20 execuções persistido em `dattago_import_history_v1`.

### Pipeline de filtros (Painel)

Aplicado em cascata: `Visão → Período → Unidade → Elemento → Ação → Contrato → Licitação → Credor`.
5 modos de Visão: `todos | pca | folha | outros | rap`.

### Órgãos bloqueados

`IPARV ASSIS`, `IPARV PREVI`, `FESURV` e `Câmara Municipal` são excluídos de todas as APIs (configurado em `src/config/tenant.ts → orgaosBloqueados`).

### Performance

- Bundle inicial 416 KB / **135 KB gzip** (code-split: painel 80 KB gzip, data-table 21 KB gzip)
- `painel` lazy isola Chart.js; `table` lazy isola @tanstack/react-table
- Virtualização ativa nas 5 rotas de tabela (30k+ linhas sem travar)
- `useMemo` em todo derived heavy; `useShallow` em seletores multi-prop

### Observabilidade

- **`ImportLog`** por API: taskCount, tasksOk/Failed, retryRounds, elapsedMs, inconsistências, recovered items
- **`ImportHistory`** persistente: últimas 20 execuções em `localStorage` (visível na DattagoPage)
- **`<ErrorBoundary>`** em cada rota: console.group estruturado + UI amigável com "Tentar novamente"
- `headerStatus` no store: feedback reativo durante import

### Multi-tenant / i18n / Auth (escalabilidade)

- **Tenant**: `src/config/tenant.ts` — adicionar município = 1 entry no registry. Resolve via `VITE_TENANT_ID` env.
- **Locale**: `src/lib/locale.ts` — adicionar idioma = 1 entry em `LOCALES`. Formatters auto-respeitam.
- **Auth**: `<AuthProvider>` placeholder pronto pra plug Cloudflare Access / Clerk / Auth0. `<RequireAuth role?>` para rotas privadas futuras.

## Deploy

GitHub Pages via Actions (`.github/workflows/deploy.yml`):
1. Push em `main` dispara o workflow
2. Build produz `dist/`
3. `actions/deploy-pages` publica em <https://pcaplanejamento-web.github.io/dattago/>

**Pré-requisito**: Repo Settings → Pages → Source = "GitHub Actions"

## Histórico

Origem: rewrite completo da versão anterior em vanilla ES modules + CSS puro (repositório `despesas`). Migração realizada em 2026-05 nas ondas V0–V12, seguida de D1–D11 (paridade visual + bug fixes), P1–P4 (observabilidade + virtualização), S1–S4 (escalabilidade), N1–N3 (lint + coverage + docs).

## Licença

MIT
