"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  variant?: "primary" | "danger";
  placeholder?: string;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  variant = "primary",
  placeholder,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setValue("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const needsInput = placeholder !== undefined;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm animate-modalIn" onClick={onCancel} />
      <div className="relative bg-canvas rounded-2xl w-full max-w-md shadow-[0_24px_60px_rgba(23,25,21,0.25)] animate-modalIn overflow-hidden">
        <header className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
          <h3 className="font-display text-xl tracking-tight text-ink leading-tight flex-1">{title}</h3>
          <button
            onClick={onCancel}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-ink-secondary hover:bg-bone-secondary hover:text-ink transition-colors cursor-pointer border-none bg-transparent"
            aria-label="Close"
          >
            <Icon.X />
          </button>
        </header>
        <div className="px-6 pb-6">
          <p className="font-sans text-sm text-ink-secondary leading-relaxed">{message}</p>

          {needsInput && (
            <textarea
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              rows={3}
              className="mt-4 w-full border border-hairline rounded-lg px-4 py-3 text-sm outline-none focus:border-primary text-ink resize-none font-sans bg-canvas"
            />
          )}
        </div>
        <footer className="flex items-center justify-end gap-3 px-6 py-4 border-t border-hairline bg-bone-secondary/40">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-sans font-semibold border border-hairline text-ink-secondary hover:bg-canvas transition-colors cursor-pointer bg-canvas"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(needsInput ? value : undefined)}
            disabled={needsInput && !value.trim()}
            className={`px-4 py-2 rounded-lg text-sm font-sans font-semibold text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-none ${
              variant === "danger" ? "bg-error hover:opacity-90" : "bg-primary hover:bg-primary-dark"
            }`}
          >
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
