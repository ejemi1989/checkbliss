import type { ReactNode } from "react";

type Variant = "neutral" | "success" | "warning" | "danger" | "accent";

const variants: Record<Variant, string> = {
  neutral: "border-hairline text-ink-secondary bg-bone-secondary",
  success: "border-primary/30 text-primary-dark bg-primary-bg",
  warning: "border-warning/30 text-warning bg-warning/10",
  danger: "border-error/30 text-error bg-error/5",
  accent: "border-primary text-primary bg-transparent",
};

type Props = {
  children: ReactNode;
  variant?: Variant;
  dot?: boolean;
  uppercase?: boolean;
};

export type StatusPillProps = Props;

/* Small status indicator — pill with optional dot, editorial weight. */
export function StatusPill({ children, variant = "neutral", dot, uppercase = true }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-sans font-semibold tracking-[0.06em] ${variants[variant]} ${uppercase ? "uppercase" : ""}`}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
