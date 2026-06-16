"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { loginAction } from "@/actions/auth";
import { Footer } from "@/components/footer";

const CREDENTIALS = [
  { role: "Admin", email: "admin@checkbliss.com" },
  { role: "Operator", email: "operator@checkbliss.com" },
  { role: "Owner", email: "owner@checkbliss.com" },
] as const;

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null);
  const [fillEmail, setFillEmail] = useState("");

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 max-sm:px-5">
        <Link href="/" className="font-sans text-xl font-bold tracking-tight text-ink no-underline">checkin<span className="text-brass">Bliss</span></Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 w-11 h-11 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg">C</div>
            <h1 className="font-sans text-xl font-bold tracking-tight text-ink">Sign in</h1>
            <p className="font-sans text-xs text-ink-secondary mt-1.5">Access your dashboard</p>
          </div>

          <form action={formAction} className="space-y-4">
            <div>
              <label className="font-sans text-xs font-medium text-ink-secondary block mb-1.5">Email</label>
              <input
                type="email"
                name="email"
                placeholder="you@email.com"
                defaultValue={fillEmail}
                className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm font-sans text-ink outline-none focus:border-primary transition-colors"
                required
              />
            </div>
            <div>
              <label className="font-sans text-xs font-medium text-ink-secondary block mb-1.5">Password</label>
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm font-sans text-ink outline-none focus:border-primary transition-colors"
                required
              />
            </div>
            {state?.error && <p className="font-sans text-xs text-danger text-center bg-danger/5 rounded-lg py-2">{state.error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-wait cursor-pointer border-none"
            >
              {pending ? "Signing in\u2026" : "Sign in"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="font-sans text-xs text-ink-secondary hover:text-ink transition-colors">&larr; Back to home</Link>
          </div>

          <div className="mt-8 rounded-lg border border-hairline bg-bone p-4">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.5px] text-ink-secondary mb-3 text-center">Demo credentials</p>
            <div className="space-y-2">
              {CREDENTIALS.map((c) => (
                <button
                  key={c.email}
                  onClick={() => setFillEmail(c.email)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-sans cursor-pointer transition-colors border-none bg-transparent ${
                    fillEmail === c.email ? "bg-primary text-white" : "text-ink-secondary hover:bg-white hover:text-ink"
                  }`}
                >
                  <span className="font-medium">{c.role}</span>
                  <span className="font-sans">{c.email}</span>
                  <span className="text-[10px] opacity-60">checkbliss</span>
                </button>
              ))}
            </div>
            <p className="font-sans text-[10px] text-ink-secondary mt-2 text-center">Click a role to fill, password is always <strong>checkbliss</strong></p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
