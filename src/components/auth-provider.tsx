import { createContext, useContext, useMemo, type ReactNode } from "react";

// ══════════════════════════════════════════════════════════════
//  AuthProvider — PLACEHOLDER pra autenticação futura
// ══════════════════════════════════════════════════════════════
//
// O dattago hoje é público — sem login. Esta camada existe pra unificar
// o ponto de extensão quando login virar requisito (RBAC, multi-tenant
// privado, etc.) sem precisar refatorar consumidores depois.
//
// Como plugar autenticação real:
//   1. Substituir o useState/value placeholder por integração c/
//      Cloudflare Access, SSO, OAuth, Auth0, Clerk etc.
//   2. Implementar `signIn()` / `signOut()` que chamem o provider real.
//   3. `useAuth()` retorna `{ user, isAuthenticated, signIn, signOut }`.
//   4. Wrapper `<RequireAuth>` em rotas que precisam login (router.tsx).
//
// Hoje:
//   - isAuthenticated = true (modo público / sempre logado como "Anônimo")
//   - RequireAuth = passthrough (renderiza children sem checar)
//
// Mantém contrato estável p/ código que já consome useAuth() (futuro).

export interface AuthUser {
  /** Identificador único (email / sub do JWT / etc). Null em modo anônimo. */
  id: string | null;
  /** Nome de exibição. */
  name: string;
  /** Lista de roles (RBAC). Vazia em modo anônimo. */
  roles: readonly string[];
}

export interface AuthContextValue {
  user: AuthUser;
  isAuthenticated: boolean;
  /** Trigger de login. Hoje no-op. */
  signIn: () => Promise<void>;
  /** Trigger de logout. Hoje no-op. */
  signOut: () => Promise<void>;
  /** Checa se o user tem uma role. */
  hasRole: (role: string) => boolean;
}

const AnonymousUser: AuthUser = {
  id: null,
  name: "Anônimo",
  roles: [],
};

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Provider de auth — montado uma vez na raíz do app (main.tsx).
 * Hoje retorna sempre "autenticado como anônimo" (sistema público).
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const value = useMemo<AuthContextValue>(
    () => ({
      user: AnonymousUser,
      // true em modo público — quando integrar auth real, derive do estado interno
      isAuthenticated: true,
      signIn: async () => {
        // Placeholder — implementar redirect pro provider (Cloudflare Access, etc.)
        console.warn("[auth] signIn() ainda não implementado");
      },
      signOut: async () => {
        console.warn("[auth] signOut() ainda não implementado");
      },
      hasRole: (role) => AnonymousUser.roles.includes(role),
    }),
    [],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hook para consumir o auth. Lança se chamado fora do provider. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}

// ══════════════════════════════════════════════════════════════
//  RequireAuth — wrapper de rotas privadas
// ══════════════════════════════════════════════════════════════

interface RequireAuthProps {
  children: ReactNode;
  /** Role mínima exigida. Sem prop = só exige login. */
  role?: string;
  /** O que renderizar quando não autorizado. Default: mensagem amigável. */
  fallback?: ReactNode;
}

/**
 * Wrappa rotas que exigem login. Hoje (sistema público) sempre renderiza children.
 * Quando auth real existir, automaticamente passa a barrar acesso.
 *
 * Uso (router.tsx):
 *   { path: "admin", element: <RequireAuth role="admin"><AdminPage /></RequireAuth> }
 */
export function RequireAuth({ children, role, fallback }: RequireAuthProps) {
  const { isAuthenticated, hasRole } = useAuth();

  if (!isAuthenticated) {
    return fallback ?? <UnauthenticatedMessage />;
  }

  if (role && !hasRole(role)) {
    return fallback ?? <ForbiddenMessage role={role} />;
  }

  return <>{children}</>;
}

function UnauthenticatedMessage() {
  return (
    <div className="flex min-h-[40svh] flex-col items-center justify-center gap-2 text-center p-6">
      <h2 className="text-lg font-semibold">Login necessário</h2>
      <p className="text-sm text-muted-foreground">
        Você precisa estar autenticado para acessar esta página.
      </p>
    </div>
  );
}

function ForbiddenMessage({ role }: { role: string }) {
  return (
    <div className="flex min-h-[40svh] flex-col items-center justify-center gap-2 text-center p-6">
      <h2 className="text-lg font-semibold">Acesso restrito</h2>
      <p className="text-sm text-muted-foreground">
        Esta página exige o papel <code className="font-mono">{role}</code>.
      </p>
    </div>
  );
}
