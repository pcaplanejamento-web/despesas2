import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PanelBannerProps {
  /** Título grande no banner (cor accent automática). */
  title: string;
  /** Subtítulo abaixo do título (cor muted). */
  sub?: ReactNode;
  /** Conteúdo da direita — botões/actions. */
  actions?: ReactNode;
  className?: string;
}

/**
 * PanelBanner Dattago Moderno — hero banner com gradient diagonal
 * (blue→violet→surface), grid pattern por background-image com mask radial,
 * e título grande na cor accent. Usado como header da PainelPage.
 */
export function PanelBanner({ title, sub, actions, className }: PanelBannerProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-xl)] border border-border px-6 py-6 sm:px-7 sm:py-[22px]",
        className,
      )}
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--c-blue) 22%, var(--surface)) 0%, color-mix(in srgb, var(--c-violet) 18%, var(--surface)) 60%, var(--surface) 100%)",
      }}
    >
      {/* Grid pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(20,20,30,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(20,20,30,0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(900px 300px at 80% 50%, black, transparent 70%)",
          WebkitMaskImage: "radial-gradient(900px 300px at 80% 50%, black, transparent 70%)",
        }}
      />

      {/* Content */}
      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1
            className="m-0 text-[28px] font-semibold tracking-[-0.02em]"
            style={{ color: "var(--c-blue)" }}
          >
            {title}
          </h1>
          {sub && (
            <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">{sub}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
