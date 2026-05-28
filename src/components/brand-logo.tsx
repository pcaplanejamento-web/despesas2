// BrandLogo — logo oficial do Dattago.
//
// Ícone: 3 barras crescentes (chart bars) com gradient violet → blue,
// representando análise de dados e tendência de crescimento.
// Usado no sidebar brand-mark + onde aparecer o branding da marca.

interface BrandLogoIconProps {
  /** Tamanho em px. Default 22. */
  size?: number;
  /** ID único do gradient (necessário pra múltiplas instâncias). */
  gradientId?: string;
}

/**
 * Apenas o ícone (3 barras com gradient). Sem texto.
 * Usar dentro de container `.brand-mark` ou similar.
 */
export function BrandLogoIcon({ size = 22, gradientId }: BrandLogoIconProps) {
  const id =
    gradientId ?? `brand-grad-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--c-blue)" />
          <stop offset="100%" stopColor="var(--c-violet)" />
        </linearGradient>
      </defs>
      {/* 3 barras crescentes */}
      <rect x="3"  y="14" width="4" height="7"  rx="1" fill={`url(#${id})`} />
      <rect x="10" y="9"  width="4" height="12" rx="1" fill={`url(#${id})`} />
      <rect x="17" y="5"  width="4" height="16" rx="1" fill={`url(#${id})`} />
    </svg>
  );
}

interface BrandLogoFullProps {
  /** Tamanho do ícone (px). Default 28. Texto escala junto. */
  iconSize?: number;
  /** Mostra wordmark "Dattago". Default true. */
  showWordmark?: boolean;
}

/**
 * Logo completo: container square com ícone + wordmark "Dattago" ao lado.
 * Estilo do print: square arredondado + texto bold à direita.
 *
 * Uso em landing/login screen, error pages, etc. — onde o brand precisa
 * de mais presença que só o sidebar minúsculo.
 */
export function BrandLogoFull({
  iconSize = 28,
  showWordmark = true,
}: BrandLogoFullProps) {
  return (
    <div className="inline-flex items-center gap-3">
      <div
        className="flex items-center justify-center rounded-[var(--radius-sm)] border border-border"
        style={{
          width: iconSize + 18,
          height: iconSize + 18,
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--c-blue) 18%, var(--surface-3)), var(--surface-3))",
        }}
      >
        <BrandLogoIcon size={iconSize} />
      </div>
      {showWordmark && (
        <span
          className="font-semibold tracking-[-0.02em]"
          style={{ fontSize: iconSize * 1.15, color: "var(--text)" }}
        >
          Dattago
        </span>
      )}
    </div>
  );
}
