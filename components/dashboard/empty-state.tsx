import type { ReactNode } from "react";

type Props = {
  title: ReactNode;
  body: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
};

/* Composed empty state. Editorial copy, no stock illustration. */
export function EmptyState({ title, body, action, icon }: Props) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6 border border-dashed border-hairline rounded-xl">
      {icon && (
        <div className="w-12 h-12 rounded-full bg-primary-bg flex items-center justify-center text-primary mb-5">
          {icon}
        </div>
      )}
      <p className="font-display text-lg text-ink mb-1.5">{title}</p>
      <p className="text-sm text-ink-secondary max-w-sm">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
