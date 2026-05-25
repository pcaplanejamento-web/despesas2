# Maintenance recipes

Receitas concretas. Cada uma é autocontida — faça a mudança sem reler o codebase.

## 1. Adicionar uma nova rota

```tsx
// 1) src/router.tsx — adicione um child em `children: [...]`
{ path: "minha-rota", element: <MinhaPage /> },

// 2) src/pages/minha-page.tsx — crie a page
export function MinhaPage() { return <div>...</div>; }

// 3) src/layouts/sidebar.tsx — adicione item em NAV_ITEMS
{ id: "minha-rota", label: "Minha Rota", icon: SomeIcon, to: "/minha-rota" },

// 4) (opcional) src/lib/config.ts — adicione em SECTION_TITLES para título no Header
minharota: "Minha Rota",
```

## 2. Adicionar um filtro novo

```ts
// 1) src/store/index.ts — adicione o campo em FiltersSlice + initialFilters
export interface FiltersSlice { /* ... */ meuFiltro: string; }
const initialFilters: FiltersSlice = { /* ... */ meuFiltro: "" };

// 2) src/store/index.ts — adicione a key na união de setFilter
setFilter: (key: keyof Pick<FiltersSlice, "unidade" | /* ... */ | "meuFiltro">, value: string) => void;
```

```tsx
// 3) src/components/filter-bar.tsx — adicione um FilterCombobox
const meuOptions = useMemo(() => uniqStrings(afterContrato.empRows, CE.MINHA_COL), [afterContrato.empRows]);
<FilterCombobox label="Meu" icon={Tag} value={filters.meuFiltro}
  onChange={(v) => setFilter("meuFiltro", v)} options={meuOptions}
  allLabel="Todos" disabled={!hasData} />

// 4) src/hooks/use-painel-data.ts — aplique no pipeline (crie filterByMeu em lib/compute.ts)
({ empRows: emp, liqRows: liq, pgtoRows: pgto } = filterByMeu(emp, liq, pgto, filters.meuFiltro));
```

## 3. Adicionar um novo KPI

```tsx
// src/pages/painel.tsx — dentro do <div className="grid ... xl:grid-cols-6"> (vire xl:grid-cols-7)
<KpiCard
  label="Novo KPI"
  value={data.kpis.novoCampo}        // adicione novoCampo em KpiResults + computeKpis
  icon={Sparkles}                     // import de lucide-react
  accent="violet"                     // primary | blue | emerald | violet | amber | rose | teal
  loading={importing && !hasData}
  onClick={() => openDrawer("Novo KPI", "Descrição do filtro.", empFilter, liqFilter)}
/>
```

## 4. Adicionar uma coluna em uma tabela

```ts
// src/pages/table.tsx — escolha COLS_EMP / COLS_LIQ / COLS_PGTO / COLS_REC / COLS_CTR
const COLS_EMP: ColumnSpec<AnyRow>[] = [
  /* colunas existentes */
  { key: 20, label: "Histórico", align: "left" },                        // texto
  { key: 22, label: "Tipo", align: "center" },                           // string
  { key: 25, label: "Multa", align: "right", format: formatCurrency, sum: true }, // moeda
];
```

`key` é o índice 0-based no tuple da row (mapeado pelas APIs Dattago — veja `CE/CL/CP` em `src/lib/compute.ts`). Use `sum: true` para totalizar no rodapé.

## 5. Adicionar uma dimensão no Demonstrativo

```ts
// 1) src/store/index.ts — estenda a união DemonstrativoTipo
export type DemonstrativoTipo = "orgao" | /* ... */ | "minhaDim";

// 2) src/lib/compute.ts — adicione em computeAllGrouped a chave nova
return { orgaos, unidades, /* ... */ minhasDims };  // + helper que agrupa por CE.MINHA_COL

// 3) src/pages/painel.tsx — adicione em DEMO_LABELS e no switch demoDataset
const DEMO_LABELS: Record<DemonstrativoTipo, string> = { /* ... */ minhaDim: "Minha Dim" };
case "minhaDim": return { type: "padrao", rows: data.minhasDims, label: DEMO_LABELS.minhaDim, dim: "minhaDim" };

// 4) src/pages/painel.tsx — adicione case no onPadraoRowClick para abrir o drawer filtrado
```

## 6. Adicionar uma nova API ao Dattago

```ts
// 1) src/services/dattago-X.ts — siga o padrão de dattago-pagamentos.ts:
//    - ImportLog new + fill
//    - concurrentPool(tasks, CONCURRENCY_HEAVY | LIGHT | padrão, stagger)
//    - readCache/writeCache por chave cacheKey('X', { year })
//    - retorna { rows, log, completeness }
export async function getX(year: number) { /* ... */ }

// 2) src/services/dattago-api.ts — re-exporte e atualize isDattagoCached
export { getX } from './dattago-X';
hasValidCache(cacheKey('X', { year }))  // adicione no AND

// 3) src/hooks/use-import-dattago.ts — adicione getX no Promise.allSettled + perApi
const [empRes, /* ... */, xRes] = await Promise.allSettled([/* ... */, getX(year)]);

// 4) src/store/index.ts — adicione campo em DataSlice.enriched + appendEnriched
```

## 7. Criar um novo shadcn primitive

```bash
# Use a CLI oficial — segue components.json (style=new-york, baseColor=zinc, lucide)
npx shadcn@latest add tooltip      # ou alert, table, sheet etc.
# Alternativa: copie de https://ui.shadcn.com/docs/components/<name> para src/components/ui/<name>.tsx
```

## 8. Bumpar uma cor/raio do tema

```css
/* src/index.css — :root para light, .dark para dark. Edite o oklch correspondente. */
:root {
  --radius: 0.625rem;                              /* default era 0.5rem */
  --primary: oklch(0.21 0.006 285.885);            /* zinc-950 — bump pra outro tom */
  --border:  oklch(0.92 0.004 286.32);
}
.dark {
  --primary: oklch(0.92 0.004 286.32);             /* invertido em dark */
}
```

Tokens novos viram utilities Tailwind automaticamente (`bg-primary`, `text-foreground`, `border-border`, etc.).

## 9. Debugar workflow de deploy

```bash
# Local: simule o build do CI antes de empurrar
npm run build                                       # = tsc -b && vite build

# Logs do Pages: abra .github/workflows/deploy.yml + veja runs em
# https://github.com/pcaplanejamento-web/dattago/actions
```

Falhas comuns: TS errors (`tsc -b`), `base` mismatch (`vite.config.ts` deve manter `/dattago/`), permissions ausentes (precisa `pages: write` + `id-token: write`).

## 10. Habilitar virtualização numa nova rota de tabela

```tsx
// src/pages/seu-page.tsx
<DataTable
  columns={columns}
  rows={rows}
  virtualize                      // troca paginação por scroll virtual
  virtualHeight={650}             // altura px do container (default 600)
  estimateRowHeight={41}          // altura estimada por row (default 41)
/>
```

Recomendado para datasets >500 linhas. Para sub-tabelas pequenas (Demonstrativo no Painel), manter o default (paginated). Totals row é renderizado fora do scroll, sempre visível.

## 11. Debugar uma importação com falha

```ts
// 1) Console: durante o import, [Empenhos] groups mostram retentativas + recovered items.
// 2) Persistência: src/lib/import-history.ts.readImportHistory() retorna últimas 20 execuções.
//    Útil pra responder "a importação do dia X foi lenta?", "qual API falha mais?"
// 3) UI: Card 4 da DattagoPage (componente ImportHistory) mostra a mesma tabela.
// 4) Limpar cache + histórico: botão "Limpar cache" → chama clearDattagoCache + clearImportHistory.
```

## 12. Adicionar novo município (multi-tenant)

```ts
// src/config/tenant.ts — adicione const novo + entry no registry
const NOVA_CIDADE_UF: TenantConfig = {
  id: "nova-cidade",
  displayName: "Nova Cidade · UF",
  uf: "uf",
  tenantSlug: "nova-cidade",
  workerBase: "https://centi-proxy.pcaplanejamento.workers.dev/portal",
  orgaos: [/* IDs e nomes específicos */],
  orgaosBloqueados: new Set([/* lowercase + trim */]),
};

const TENANTS = { rioverde: RIO_VERDE_GO, "nova-cidade": NOVA_CIDADE_UF };
```

Ativar via env build-time: `VITE_TENANT_ID=nova-cidade npm run build` ou subdomain (extensão futura em `resolveTenantId()`).

## 13. Adicionar novo idioma (i18n)

```ts
// src/lib/locale.ts — extenda LocaleId + LOCALES
export type LocaleId = "pt-BR" | "en-US";
const LOCALES: Record<LocaleId, LocaleConfig> = {
  "pt-BR": { /* existente */ },
  "en-US": {
    id: "en-US",
    currency: "USD",
    months: ["January", /* ... */],
    monthsAbbrev: ["Jan", /* ... */],
  },
};
```

Ativar via `VITE_LOCALE_ID=en-US`. Todo `formatCurrency`/`formatPercent`/`getMonthName` automaticamente respeita.

## 14. Plugar auth real (no AuthProvider placeholder)

```tsx
// src/components/auth-provider.tsx — substitua o useMemo do value
const value = useMemo(() => {
  const session = useSomeAuthSDK();  // Auth0, Clerk, Cloudflare Access, etc.
  return {
    user: session?.user ? { id: session.user.id, name: session.user.name, roles: session.user.roles } : AnonymousUser,
    isAuthenticated: !!session?.user,
    signIn: () => authSDK.login(),
    signOut: () => authSDK.logout(),
    hasRole: (role) => session?.user?.roles.includes(role) ?? false,
  };
}, [session]);
```

Marcar rotas privadas em `router.tsx`:
```tsx
{ path: "admin", element: <RequireAuth role="admin"><AdminPage /></RequireAuth> }
```

## 15. Adicionar testes a uma função nova

```ts
// src/lib/minha-funcao.test.ts
import { describe, it, expect } from "vitest";
import { minhaFuncao } from "./minha-funcao";

describe("minhaFuncao", () => {
  it("comportamento esperado", () => {
    expect(minhaFuncao(input)).toBe(expected);
  });
});
```

Rode `npm test` (CI mode) ou `npm run test:watch` (loop). CI roda automaticamente antes do build.

## 16. Regras de naming (inegociáveis)

- **"Centi" PROIBIDO** em todo o código novo. Única exceção: a URL do Worker em `dattago-core.ts` (`https://centi-proxy.pcaplanejamento.workers.dev`).
- **Caracteres PT-BR preservados** (`Á É Í Ó Ú Ç ã õ` etc.) em parsing, sanitização e tabelas — não normalize agressivamente. `sanitizeFieldValue` em `dattago-core.ts` é a referência.
- **Órgãos bloqueados**: IPARV ASSIS, IPARV PREVI, FESURV, Câmara — filtrados em `ORGAOS_BLOQUEADOS` (`dattago-core.ts`). Aplicar **após map, antes do cache**.
- Stack inegociável: React 19 + Vite 8 + TS strict + Tailwind 4 + shadcn New York. Não migrar para Next.js, não trocar bundler.

---

## Para IAs futuras

> **Antes de modificar código**, leia `ARCHITECTURE.md` (5 min) + `COMPONENTS.md` (1 min) primeiro.
> **Use receitas em `MAINTENANCE.md`** em vez de re-explorar o codebase.
> **Stack inegociável**: React 19 + Vite 8 + TS strict + Tailwind 4 + shadcn. NÃO migrar para Next.js, NÃO adicionar bundler ou framework diferente.
> **Design system Vega**: shadcn New York + lucide-react + Geist Sans + `--radius: 0.5rem`. NÃO mude paleta nem fonte sem aprovação.
> **Após mudanças**, rode `npm run build` antes de commit para garantir `tsc -b` + bundle limpos.
