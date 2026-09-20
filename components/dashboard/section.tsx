import type { ReactNode } from "react";

type Props = {
  eyebrow: string;
  count?: number | string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

/* Section break with hairline rule and editorial heading.
   `eyebrow` is the small caps label, `count` shows total after the heading. */
export function Section({ eyebrow, count, description, actions, children, className }: Props) {
  return (
    <section className={`pt-10 pb-12 first:pt-0 ${className ?? ""}`}>
      <div className="flex items-end justify-between gap-4 pb-5 mb-6 border-b border-hairline">
        <div>
          <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
          <div className="flex items-baseline gap-3 mt-1.5">
            <h2 className="font-display text-xl tracking-tight text-ink">{count !== undefined ? `${eyebrow}` : eyebrow}</h2>
            {count !== undefined && (
              <span className="font-sans text-xs text-ink-tertiary tabular-nums">{count}</span>
            )}
          </div>
          {description && <p className="mt-1.5 text-sm text-ink-secondary max-w-[60ch]">{description}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
