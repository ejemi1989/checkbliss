"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/actions/auth";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await requestPasswordResetAction(null, fd);
      if (result?.error) setError(result.error);
      else if (result?.success) setSuccess(result.success);
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md">
        <Link href="/login" className="block text-center mb-6 no-underline">
          <img src="/assets/images/logo/Logo.png" alt="CheckinBliss" className="h-8 w-auto mx-auto" />
        </Link>

        <div className="p-8 rounded-2xl border border-hairline bg-card space-y-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mute mb-1.5">Reset password</p>
            <h1 className="font-display text-2xl font-medium text-ink mb-1.5">Forgot your password?</h1>
            <p className="text-sm text-ink-secondary">
              Enter your email and we&rsquo;ll send you a link to choose a new password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-mute mb-1.5">Email address</label>
              <input
                type="email"
                name="email"
                required
                placeholder="you@email.com"
                className="w-full px-4 py-3 rounded-lg border border-line bg-card text-sm text-ink outline-none focus:border-primary transition-colors"
              />
            </div>

            {error && (
              <p className="text-xs font-medium text-danger">{error}</p>
            )}
            {success && (
              <p className="text-xs font-medium text-success">{success}</p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full py-3 rounded-lg bg-primary text-soft text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-60 cursor-pointer"
            >
              {pending ? "Sending\u2026" : "Send reset link"}
            </button>
          </form>

          <p className="text-center text-sm text-ink-secondary">
            Remembered it?{" "}
            <Link href="/login" className="text-primary font-semibold no-underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
