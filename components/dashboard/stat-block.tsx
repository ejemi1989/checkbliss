import type { ReactNode } from "react";

type Props = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  trend?: "up" | "down" | "flat";
  accent?: boolean;
};

/* Editorial stat block. Number dominant (display serif), label as eyebrow.
   No card container — sits on the canvas with a hairline below the label.
   When `accent` is true the value takes the lagoon primary color. */
export function StatBlock({ label, value, hint, trend, accent }: Props) {
  const trendGlyph = trend === "up" ? "↑" : trend === "down" ? "↓" : trend === "flat" ? "→" : null;
  const trendColor =
    trend === "up" ? "text-primary" : trend === "down" ? "text-error" : "text-ink-tertiary";

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary">
        {label}
      </p>
      <p
        className={`font-display text-[2.25rem] leading-none tracking-tight tabular-nums ${
          accent ? "text-primary" : "text-ink"
        }`}
      >
        {value}
      </p>
      {(hint || trendGlyph) && (
        <p className="flex items-center gap-1.5 text-xs text-ink-secondary">
          {trendGlyph && <span className={`font-semibold ${trendColor}`}>{trendGlyph}</span>}
          <span>{hint}</span>
        </p>
      )}
    </div>
  );
}

/* Editorial stat row. Auto-fits 1/2/3/4 columns with generous gap and
   vertical hairlines between cells. No card boxes. */
export function StatGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-hairline">
      {Array.isArray(children)
        ? children.map((child, i) => (
            <div key={i} className={i > 0 ? "lg:pl-8" : ""}>
              {child}
            </div>
          ))
        : children}
    </div>
  );
}
