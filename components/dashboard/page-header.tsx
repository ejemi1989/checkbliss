import type { ReactNode } from "react";

type Props = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
};

/* Editorial page header. Display serif (Newsreader) headline at tight tracking.
   Eyebrow is uppercase tracked at 11px. Description is muted body, max 65ch. */
export function PageHeader({ eyebrow, title, description, actions, meta }: Props) {
  return (
    <header className="flex flex-col gap-6 pb-10 mb-10 border-b border-hairline lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-[65ch]">
        {eyebrow && (
          <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary mb-3">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-[2.5rem] leading-[1.05] tracking-tight text-ink lg:text-[3.25rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-4 text-base text-ink-secondary leading-relaxed">
            {description}
          </p>
        )}
        {meta && <div className="mt-5">{meta}</div>}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </header>
  );
}
