"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { loginAction } from "@/actions/auth";

const CREDENTIALS = [
  { role: "Admin", email: "admin@checkbliss.com", sub: "Strategic oversight, financial control" },
  { role: "Operator — Lagos", email: "operator-lagos@checkbliss.com", sub: "Lagos city operations" },
  { role: "Operator — Abuja", email: "operator-abuja@checkbliss.com", sub: "Abuja city operations" },
  { role: "Owner", email: "owner@checkbliss.com", sub: "Property portfolio" },
] as const;

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [fillEmail, setFillEmail] = useState("");

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await loginAction(null, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="min-h-screen flex">
      {/* Image panel */}
      <div className="hidden lg:block lg:w-5/12 xl:w-1/2 relative overflow-hidden bg-ink">
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80"
          alt="Premium Lagos apartment interior"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-ink/70 via-ink/30 to-transparent" />

        <div className="relative z-10 flex flex-col justify-between h-full p-12 xl:p-16">
          <Link href="/" className="no-underline">
            <img src="/checkbliss%20logo.png" alt="CheckinBliss" className="h-7 w-auto brightness-0 invert" />
          </Link>

          <div className="pb-8">
            <p className="font-display italic text-[clamp(22px,2.4vw,30px)] text-white/85 leading-relaxed mb-4 max-w-[420px]">
              &ldquo;The premium way to stay in Africa&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-[18px] h-[18px] text-trustpilot" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="font-sans text-sm font-medium text-white/75">4.8 on Trustpilot</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center bg-bone px-6 py-12 lg:px-12 xl:px-20">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <Link href="/" className="no-underline inline-block">
              <img src="/checkbliss%20logo.png" alt="CheckinBliss" className="h-7 w-auto" />
            </Link>
          </div>

          <div className="mb-8">
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-mute mb-2">Welcome back</p>
            <h1 className="font-display text-[clamp(1.8rem,3vw,2.4rem)] font-medium leading-tight text-ink">Sign in to your account</h1>
            <p className="font-sans text-sm text-ink-secondary mt-2">Access your dashboard, bookings, and properties.</p>
          </div>

          <form action={handleSubmit} className="space-y-5">
            <div>
              <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute block mb-1.5">Email address</label>
              <input
                type="email"
                name="email"
                placeholder="you@email.com"
                defaultValue={fillEmail}
                className="w-full border border-line rounded-[var(--radius-md)] px-4 py-3 text-[15px] font-sans text-ink bg-card outline-none focus:border-green-soft transition-colors"
                required
              />
            </div>
            <div>
              <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute block mb-1.5">Password</label>
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                className="w-full border border-line rounded-[var(--radius-md)] px-4 py-3 text-[15px] font-sans text-ink bg-card outline-none focus:border-green-soft transition-colors"
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-[var(--radius-md)] bg-danger/5 border border-danger/20">
                <p className="font-sans text-xs text-danger font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full py-3.5 rounded-[var(--radius-sm)] bg-brass text-soft font-sans text-[15px] font-semibold transition-all hover:bg-brass-dark disabled:opacity-50 disabled:cursor-wait cursor-pointer border-none"
            >
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-line" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-bone px-4 font-sans text-mute font-medium uppercase tracking-[0.1em]">Demo access</span>
              </div>
            </div>

            <div className="space-y-2">
              {CREDENTIALS.map((c) => (
                <button
                  key={c.email}
                  type="button"
                  onClick={() => setFillEmail(c.email)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] text-sm font-sans cursor-pointer transition-all border ${
                    fillEmail === c.email
                      ? "border-brass bg-brass/5 text-ink"
                      : "border-line bg-card text-ink-secondary hover:border-green-soft hover:text-ink"
                  }`}
                >
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    fillEmail === c.email ? "bg-brass text-soft" : "bg-soft text-mute"
                  }`}>
                    {c.role[0]}
                  </span>
                  <div className="text-left min-w-0">
                    <div className="font-medium text-[13px]">{c.role}</div>
                    <div className="text-[11px] opacity-60 truncate">{c.email}</div>
                    <div className="text-[10px] opacity-50 truncate">{c.sub}</div>
                  </div>
                  <span className="ml-auto text-[10px] font-mono opacity-40 shrink-0">checkbliss-demo-2026</span>
                </button>
              ))}
            </div>
            <p className="font-sans text-[10px] text-mute text-center mt-3">
              Click a role to pre-fill. Password is <strong className="text-ink-secondary">checkbliss-demo-2026</strong> for all.
            </p>
          </div>

          <div className="mt-8 text-center space-y-3">
            <p className="font-sans text-xs text-mute">
              Don&rsquo;t have an account?{" "}
              <Link href="/signup" className="text-green-soft hover:text-brass-dark transition-colors font-medium no-underline">
                Get started
              </Link>
            </p>
            <Link href="/" className="block font-sans text-xs text-green-soft hover:text-brass-dark transition-colors no-underline">
              &larr; Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
