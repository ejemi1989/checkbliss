"use client";

import { useEffect, type ReactNode } from "react";
import { Icon } from "@/components/icons";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  children: ReactNode;
  footer?: ReactNode;
};

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

/* Editorial modal. Backdrop blur, max-height scroll, escape + scroll-lock.
   Replaces the ad-hoc `fixed inset-0 z-50 bg-black/30 backdrop-blur-sm ... bg-white rounded-2xl`
   pattern used across admin + dashboards. */
export function Modal({ open, onClose, title, description, size = "md", children, footer }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm animate-modalIn"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative bg-canvas rounded-2xl w-full ${SIZES[size]} shadow-[0_24px_60px_rgba(23,25,21,0.25)] animate-modalIn max-h-[90vh] overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || description) && (
          <header className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-hairline">
            <div className="flex-1 min-w-0">
              {title && (
                <h3 className="font-display text-xl tracking-tight text-ink leading-tight">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs text-ink-secondary mt-1.5 font-sans">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-ink-secondary hover:bg-bone-secondary hover:text-ink transition-colors cursor-pointer border-none bg-transparent"
              aria-label="Close"
            >
              <Icon.X />
            </button>
          </header>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <footer className="flex items-center justify-end gap-3 px-6 py-4 border-t border-hairline bg-bone-secondary/40">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

/* Pre-built button styles used inside Modal footers. Keeping them here
   rather than as local classes so every modal footer looks identical. */
export const ModalButton = {
  Cancel: (
    <button
      type="button"
      className="px-4 py-2 rounded-lg text-sm font-sans font-semibold border border-hairline text-ink-secondary hover:bg-bone transition-colors cursor-pointer bg-canvas"
    >
      Cancel
    </button>
  ),
  Primary: (label: string, type: "button" | "submit" = "button", disabled = false) => (
    <button
      type={type}
      disabled={disabled}
      className="px-4 py-2 rounded-lg text-sm font-sans font-semibold bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer border-none disabled:opacity-50 disabled:cursor-wait"
    >
      {label}
    </button>
  ),
  Danger: (label: string, type: "button" | "submit" = "button", disabled = false) => (
    <button
      type={type}
      disabled={disabled}
      className="px-4 py-2 rounded-lg text-sm font-sans font-semibold bg-error text-white hover:opacity-90 transition-opacity cursor-pointer border-none disabled:opacity-50 disabled:cursor-wait"
    >
      {label}
    </button>
  ),
  Subtle: (label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 rounded-lg text-sm font-sans font-semibold border border-hairline text-ink-secondary hover:bg-bone transition-colors cursor-pointer bg-canvas"
    >
      {label}
    </button>
  ),
};
