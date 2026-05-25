import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorBoundaryProps {
  /** Child tree a proteger. Geralmente uma `<Page />`. */
  children: ReactNode;
  /** Label do contexto (ex.: "Painel", "Empenhos") — exibido na UI. */
  label?: string;
  /** Render alternativo. Se omitido, usa fallback shadcn default. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * ErrorBoundary — captura throws de render/lifecycle nos descendentes.
 * Sem isso, qualquer erro na árvore deixa a tela em branco.
 *
 * Cada rota do router é envolvida por uma instância (com `label` apropriado),
 * isolando falhas — um crash no Painel não derruba a Sidebar/Header.
 *
 * Class component (React não suporta hooks p/ error boundaries até hoje).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log estruturado p/ console — futuro: integração c/ Sentry/Plausible/etc.
    console.group(`[ErrorBoundary${this.props.label ? ` · ${this.props.label}` : ""}]`);
    console.error("Error:", error);
    console.error("Component stack:", info.componentStack);
    console.groupEnd();
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    const { children, fallback, label } = this.props;

    if (!error) return children;
    if (fallback) return fallback(error, this.reset);

    return (
      <div className="flex min-h-[60svh] items-center justify-center p-6">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                <AlertTriangle className="size-5" />
              </span>
              <div className="space-y-1">
                <CardTitle>Algo deu errado{label ? ` em ${label}` : ""}</CardTitle>
                <CardDescription>
                  Um erro inesperado interrompeu a renderização. Você pode tentar novamente sem perder os dados já carregados.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <details className="rounded-md border bg-muted/40 p-3 text-xs">
              <summary className="cursor-pointer font-medium text-muted-foreground">
                Detalhes técnicos
              </summary>
              <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-foreground">
                {error.name}: {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
            <div className="flex gap-2">
              <Button onClick={this.reset}>
                <RefreshCw /> Tentar novamente
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Recarregar página
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}
