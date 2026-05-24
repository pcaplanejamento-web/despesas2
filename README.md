# Dattago

> Painel de visualização de despesas do município de Rio Verde · GO (PMRV). Importa dados públicos da API Dattago em tempo real.

🚀 **Produção**: https://pcaplanejamento-web.github.io/dattago/

## Stack

- **React 19** + **Vite 8** + **TypeScript** (strict mode)
- **Tailwind CSS 4** + tokens **shadcn** (New York, zinc, radius 0.5rem)
- **Zustand 5** (state) · **React Router 6** (hash mode)
- **Chart.js 4** + react-chartjs-2 · **@tanstack/react-table 8**
- **lucide-react** (ícones) · **date-fns** (datas)

Design system: estilo Vercel/v0/Linear — minimalista, paleta neutra, accent único, sombras sutis, sidebar sólida/translúcida.

## Estrutura

```
src/
  components/      # UI compartilhada
    ui/            # primitives shadcn (button, card, input, table)
    data-table.tsx
    kpi-card.tsx
    filter-bar.tsx
    theme-provider.tsx
  hooks/           # use-import-dattago, use-auto-import, use-painel-data
  layouts/         # app-shell, sidebar, header
  lib/             # compute, config, kpis, enrichment, utils
  pages/           # painel, table (param x5), dattago
  services/        # dattago-api + 5 endpoints + core
  store/           # Zustand
  router.tsx
  main.tsx
```

## Scripts

```bash
npm install      # deps
npm run dev      # localhost:5173/dattago/ (HMR)
npm run build    # dist/ produção
npm run preview  # serve dist localmente
npm run lint     # eslint
```

## Deploy

GitHub Pages via Actions (`.github/workflows/deploy.yml`):

1. Push para `main` dispara o workflow
2. Build produz `dist/`
3. `actions/deploy-pages` publica em https://pcaplanejamento-web.github.io/dattago/

**Pré-requisito**: Repo Settings → Pages → Source = "GitHub Actions"

## Arquitetura

### Importação de dados

5 endpoints da API Dattago (via Cloudflare Worker `centi-proxy.pcaplanejamento.workers.dev`):
- **Empenhos** · **Liquidações** · **Pagamentos** · **Receita** · **Contratos**

Fetch em paralelo via `Promise.allSettled` com concorrência calibrada:
- HEAVY (3 workers, stagger 200ms) — Liquidações + Receita
- LIGHT (5 workers) — Contratos
- Retry loop até completeness 100%

### Cache

`localStorage` com TTL 15min e `CACHE_VERSION='v12'`. Caches incompletos não são persistidos.

### Pipeline de filtros

Aplicado em cascata no Painel: `Visão → Período → Unidade → Elemento → Ação → Contrato → Licitação → Credor`.

5 modos de Visão: `todos | pca | folha | outros | rap` (Restos a Pagar usa fonte de dados separada).

### Filtros bloqueados

Os órgãos `IPARV ASSIS`, `IPARV PREVI` e `FESURV` são excluídos de todas as APIs com campo órgão (Empenhos / Liquidações / Pagamentos / Receita).

## Histórico

Origem: rewrite completo da versão anterior em vanilla ES modules + CSS puro (repositório `despesas`). Migração realizada em 2026-05 nas ondas V0-V11.

## Licença

MIT
