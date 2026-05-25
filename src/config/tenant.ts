// tenant.ts — Configuração por município (multi-tenant ready).
//
// Hoje há 1 tenant (rio verde · go). Esta camada extrai TUDO que é específico
// de município (URL do worker, UF, slug, lista de órgãos, lista bloqueada)
// para um único arquivo — permitindo no futuro:
//
//   1. Adicionar novos municípios = adicionar 1 const novo aqui.
//   2. Trocar tenant por env / subdomain / localStorage sem tocar consumers.
//   3. Tests com tenant fixture isolado.
//
// dattago-core.ts importa `getCurrentTenant()` no boot; constantes derivadas
// (BASE, UF, TENANT, ORGAOS, ORGAOS_BLOQUEADOS) viram thin re-exports.

export interface Orgao {
  id: number;
  nome: string;
}

export interface TenantConfig {
  /** Identificador único (slug). Usado em chaves de cache, logs, URLs. */
  id: string;
  /** Nome de exibição na UI. */
  displayName: string;
  /** Sigla do estado (UF). */
  uf: string;
  /** Path-slug usado nas URLs do worker proxy. */
  tenantSlug: string;
  /**
   * Base URL do Cloudflare Worker proxy.
   * Manter como única referência ao termo "Centi" no projeto inteiro
   * (Worker em produção, legacy naming antes do rename de 2026).
   */
  workerBase: string;
  /** Lista oficial de órgãos consultáveis (id + nome). */
  orgaos: readonly Orgao[];
  /**
   * Órgãos PROIBIDOS de aparecer no painel — filtrados em todas as APIs.
   * Strings já normalizadas (lowercase, trim) p/ match direto.
   */
  orgaosBloqueados: ReadonlySet<string>;
}

// ══════════════════════════════════════════════════════════════
//  Tenants disponíveis
// ══════════════════════════════════════════════════════════════

const RIO_VERDE_GO: TenantConfig = {
  id: "rioverde",
  displayName: "Rio Verde · GO",
  uf: "go",
  tenantSlug: "rioverde",
  workerBase: "https://centi-proxy.pcaplanejamento.workers.dev/portal",

  orgaos: [
    { id: 2,  nome: "PREFEITURA MUNICIPAL DE RIO VERDE" },
    { id: 3,  nome: "FUNDO MUNICIPAL SAUDE RIO VERDE" },
    { id: 4,  nome: "FUNDO MUNICIPAL DE ASSISTENCIA SOCIAL DE RIO VERDE" },
    { id: 5,  nome: "FUNDACAO MUNICIPAL DE CULTURA DE RIO VERDE" },
    { id: 6,  nome: "FUNDO MUNICIPAL DE EDUCACAO DE RIO VERDE" },
    { id: 7,  nome: "FUNDO DO MEIO AMBIENTE DO MUNICIPIO DE RIO VERDE" },
    { id: 8,  nome: "AGENCIA MUN DE MOBILIDADE E TRANSITO DE RIO VERDE" },
    { id: 9,  nome: "FUND. DE MAN. E DES. DA EDUC. BASICA DE RIO VERDE" },
    { id: 10, nome: "FM DIREITOS CRIANCA/ADOL RIO VERDE" },
    { id: 11, nome: "F ESPECIAL M CORPO DE BOMBEIRO DE RIO VERDE" },
    { id: 15, nome: "FM PROT DEF CONSUMIDOR DE RIO VERDE" },
    { id: 16, nome: "AG REGULACAO FUNDIARIA DE RIO VERDE" },
    { id: 18, nome: "FD. MUN. DE ASS. SOCIAL ALTAIR COELHO DE LIMA" },
    { id: 21, nome: "FMI - FUNDO MUNICIPAL DO IDOSO" },
    { id: 22, nome: "FMP - FUNDO MUNICIPAL DE POSTURAS" },
    { id: 23, nome: "FMDES - F. M. DE DESENVOLVIMENTO ECONOMICO E SUSTENTAVEL" },
    { id: 24, nome: "AMAE - AGENCIA MUN. DE REGULACAO DOS SERVICOS DE AGUA E ESGOTO" },
    { id: 25, nome: "FMSB - FUNDO MUNICIPAL DE SANEAMENTO BASICO" },
    { id: 28, nome: "FUNDO MUNICIPAL DE TURISMO" },
  ],

  orgaosBloqueados: new Set([
    "inst.prev.assist.serv.mun.rio verde-iparv assis",
    "inst.prev.assist.serv.mun.rio verde-iparv previ",
    "fesurv - universidade de rio verde",
    "camara municipal de rio verde",
  ]),
};

/**
 * Registry de tenants — adicione novos aqui.
 * Key = TenantConfig.id (slug).
 */
const TENANTS: Record<string, TenantConfig> = {
  rioverde: RIO_VERDE_GO,
};

const DEFAULT_TENANT_ID = "rioverde";

// ══════════════════════════════════════════════════════════════
//  Resolução do tenant ativo
// ══════════════════════════════════════════════════════════════

/**
 * Resolve o tenant ativo. Hoje sempre retorna o default.
 *
 * Pontos de extensão (futuro):
 *  - Subdomínio: `rioverde.dattago.com` → slug = 'rioverde'
 *  - Query param: `?tenant=cidade-x`
 *  - localStorage: `localStorage.getItem('dattago_tenant')`
 *  - Env build-time: `import.meta.env.VITE_TENANT_ID`
 *
 * Resolução acontece 1× no module load. Para trocar tenant em runtime
 * exigiria reload — aceitável p/ multi-instância v1.
 */
function resolveTenantId(): string {
  // Env build-time tem precedência (CI pode definir VITE_TENANT_ID="cidade-x")
  const envId = import.meta.env.VITE_TENANT_ID;
  if (typeof envId === "string" && envId in TENANTS) return envId;

  // Default
  return DEFAULT_TENANT_ID;
}

let cachedTenant: TenantConfig | null = null;

/** Retorna o TenantConfig ativo. Memoizado por sessão. */
export function getCurrentTenant(): TenantConfig {
  if (cachedTenant) return cachedTenant;
  const id = resolveTenantId();
  const t = TENANTS[id];
  if (!t) throw new Error(`[tenant] Slug desconhecido: ${id}. Registre em src/config/tenant.ts`);
  cachedTenant = t;
  return t;
}

/** Lista todos os tenants registrados (para UI de seleção, se houver). */
export function listTenants(): TenantConfig[] {
  return Object.values(TENANTS);
}
