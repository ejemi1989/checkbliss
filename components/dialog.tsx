"use client";

import { useEffect, useRef, useState } from "react";

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
      <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-bone rounded-2xl w-full max-w-md p-6 shadow-[0_24px_60px_rgba(0,0,0,0.25)] animate-modalIn">
        <h3 className="font-display text-lg font-medium text-ink mb-2">{title}</h3>
        <p className="font-sans text-sm text-ink-secondary mb-5 leading-relaxed">{message}</p>

        {needsInput && (
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="w-full border border-hairline rounded-xl px-4 py-3 text-sm outline-none focus:border-primary text-ink resize-none mb-5 font-sans"
          />
        )}

        <div className="flex gap-x-3 justify-end">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl text-sm font-medium border border-hairline text-ink-secondary hover:bg-primary-bg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(needsInput ? value : undefined)}
            disabled={needsInput && !value.trim()}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-none ${
              variant === "danger" ? "bg-danger hover:bg-red-700" : "bg-primary hover:bg-primary-dark"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
