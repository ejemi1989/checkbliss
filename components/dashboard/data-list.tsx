import type { ReactNode } from "react";

type Row = {
  id: string | number;
  primary: ReactNode;
  secondary?: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  href?: string;
  unread?: boolean;
};

type Props = {
  items: Row[];
  empty?: ReactNode;
  className?: string;
};

/* Editorial data list. Hairline-divided rows, no card container.
   Each row has primary text (bold) + secondary (muted), trailing slot for status pills.
   Mark `unread` for a left hairline accent in primary color. */
export function DataList({ items, empty, className }: Props) {
  if (items.length === 0) {
    return <div className="text-sm text-ink-secondary py-8">{empty ?? "Nothing here yet."}</div>;
  }
  return (
    <ul className={`divide-y divide-hairline border-y border-hairline ${className ?? ""}`}>
      {items.map((row) => {
        const inner = (
          <div
            className={`flex items-start gap-4 py-4 px-1 transition-colors hover:bg-bone-secondary/40 ${
              row.unread ? "pl-3 border-l-2 border-primary" : ""
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-sans font-semibold text-ink truncate">{row.primary}</p>
              {row.secondary && (
                <p className="text-xs text-ink-secondary mt-0.5 truncate">{row.secondary}</p>
              )}
            </div>
            {row.meta && <div className="text-xs text-ink-tertiary shrink-0 tabular-nums">{row.meta}</div>}
            {row.trailing && <div className="shrink-0">{row.trailing}</div>}
          </div>
        );
        return (
          <li key={row.id}>
            {row.href ? (
              <a href={row.href} className="block no-underline">
                {inner}
              </a>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ul>
  );
}
