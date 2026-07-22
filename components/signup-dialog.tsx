"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { signupAction } from "@/actions/auth";
import { DIASPORA_COUNTRIES } from "@/lib/countries";

type Role = "operator" | "owner";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SignupDialog({ open, onClose }: Props) {
  const [serverState, formAction, pending] = useActionState(signupAction, null);
  const [role, setRole] = useState<Role>("owner");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", onKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setErrors({});
      setSubmitted(false);
      setRole("owner");
    }
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!open) return null;

  function validate(formData: FormData): boolean {
    const errs: Record<string, string> = {};
    if (!formData.get("name")) errs.name = "Required";
    if (!formData.get("email")) errs.email = "Required";
    if (!formData.get("phone")) errs.phone = "Required";
    if (!formData.get("country")) errs.country = "Required";
    if (role === "operator" && !formData.get("city")) errs.city = "Required";
    if (role === "owner" && !formData.get("property")) errs.property = "Required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const fd = new FormData(e.currentTarget);
    if (!validate(fd)) {
      e.preventDefault();
      return;
    }
    setSubmitted(true);
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={onClose} />

      <div
        ref={dialogRef}
        className="relative bg-bone rounded-[var(--radius-xl)] w-full max-w-[480px] max-h-[90vh] overflow-y-auto shadow-[0_24px_60px_rgba(0,0,0,0.25)] animate-modalIn"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brass flex items-center justify-center">
              <svg className="w-5 h-5 text-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <img src="/checkbliss%20logo.png" alt="CheckinBliss" className="h-6 w-auto" />
              <div className="font-sans text-[11px] text-mute">Create your account</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-line bg-card flex items-center justify-center cursor-pointer text-mute hover:text-ink hover:border-green-soft transition-all"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="p-6">
          {serverState?.success ? (
            <div className="text-center py-8">
              <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-brass/10 flex items-center justify-center">
                <svg className="w-7 h-7 text-brass" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 className="font-display text-xl font-medium text-ink mb-2">Application submitted</h3>
              <p className="font-sans text-sm text-ink-secondary mb-6 max-w-[320px] mx-auto">
                We&rsquo;ll review your application within 24 hours.
              </p>
              <button
                onClick={onClose}
                className="px-8 py-3 rounded-[var(--radius-sm)] bg-brass text-soft font-sans text-sm font-semibold cursor-pointer border-none hover:bg-brass-dark transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <p className="font-sans text-sm text-ink-secondary mb-6">
                Join as a property owner or operator. We&rsquo;ll review your application and get you set up.
              </p>

              {/* Role selector */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => { setRole("owner"); setErrors({}); }}
                  className={`p-3 rounded-[var(--radius-md)] border text-left cursor-pointer transition-all ${
                    role === "owner" ? "border-brass bg-brass/5" : "border-line bg-card hover:border-green-soft"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 text-xs font-bold ${
                    role === "owner" ? "bg-brass text-soft" : "bg-soft text-mute"
                  }`}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  </div>
                  <div className="font-sans text-xs font-semibold text-ink">Owner</div>
                  <div className="font-sans text-[10px] text-mute">List properties</div>
                </button>
                <button
                  type="button"
                  onClick={() => { setRole("operator"); setErrors({}); }}
                  className={`p-3 rounded-[var(--radius-md)] border text-left cursor-pointer transition-all ${
                    role === "operator" ? "border-brass bg-brass/5" : "border-line bg-card hover:border-green-soft"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 text-xs font-bold ${
                    role === "operator" ? "bg-brass text-soft" : "bg-soft text-mute"
                  }`}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="font-sans text-xs font-semibold text-ink">Operator</div>
                  <div className="font-sans text-[10px] text-mute">Verify properties</div>
                </button>
              </div>

              <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
                <input type="hidden" name="role" value={role} />

                {/* Google sign-up */}
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-[var(--radius-md)] border border-line bg-card font-sans text-[13px] font-medium text-ink-secondary hover:border-green-soft hover:text-ink transition-all cursor-pointer"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-line" /></div>
                  <div className="relative flex justify-center text-[10px]">
                    <span className="bg-bone px-3 font-sans text-mute uppercase tracking-[0.1em]">or</span>
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    name="name"
                    placeholder="Full name"
                    className={`w-full border rounded-[var(--radius-md)] px-3.5 py-2.5 text-sm font-sans text-ink bg-card outline-none transition-colors ${errors.name ? "border-danger" : "border-line focus:border-green-soft"}`}
                    required
                  />
                  {errors.name && <p className="font-sans text-[10px] text-danger mt-1">{errors.name}</p>}
                </div>

                <div>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email address"
                    className={`w-full border rounded-[var(--radius-md)] px-3.5 py-2.5 text-sm font-sans text-ink bg-card outline-none transition-colors ${errors.email ? "border-danger" : "border-line focus:border-green-soft"}`}
                    required
                  />
                  {errors.email && <p className="font-sans text-[10px] text-danger mt-1">{errors.email}</p>}
                </div>

                <div>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone number"
                    className={`w-full border rounded-[var(--radius-md)] px-3.5 py-2.5 text-sm font-sans text-ink bg-card outline-none transition-colors ${errors.phone ? "border-danger" : "border-line focus:border-green-soft"}`}
                    required
                  />
                  {errors.phone && <p className="font-sans text-[10px] text-danger mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <select
                    name="country"
                    defaultValue=""
                    className={`w-full border rounded-[var(--radius-md)] px-3.5 py-2.5 text-sm font-sans text-ink bg-card outline-none appearance-none cursor-pointer transition-colors ${errors.country ? "border-danger" : "border-line focus:border-green-soft"}`}
                    required
                  >
                    <option value="" disabled>Country of residence</option>
                    {DIASPORA_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                  {errors.country && <p className="font-sans text-[10px] text-danger mt-1">{errors.country}</p>}
                </div>

                {/* Verification notice */}
                <div className="p-3 rounded-[var(--radius-md)] bg-lagoon/5 border border-lagoon/15">
                  <p className="font-sans text-[11px] text-ink-secondary leading-relaxed">
                    <strong className="text-ink">Diaspora verification required.</strong> Phone verification via text message. Flight ticket or ID may be required.
                  </p>
                </div>

                {role === "operator" && (
                  <div>
                    <select
                      name="city"
                      defaultValue=""
                      className={`w-full border rounded-[var(--radius-md)] px-3.5 py-2.5 text-sm font-sans text-ink bg-card outline-none appearance-none cursor-pointer transition-colors ${errors.city ? "border-danger" : "border-line focus:border-green-soft"}`}
                      required
                    >
                      <option value="" disabled>Assigned city</option>
                      <option value="Lagos">Lagos</option>
                      <option value="Abuja">Abuja</option>
                      <option value="Port Harcourt">Port Harcourt</option>
                    </select>
                    {errors.city && <p className="font-sans text-[10px] text-danger mt-1">{errors.city}</p>}
                  </div>
                )}

                {role === "owner" && (
                  <div>
                    <input
                      type="text"
                      name="property"
                      placeholder="Property name or address"
                      className={`w-full border rounded-[var(--radius-md)] px-3.5 py-2.5 text-sm font-sans text-ink bg-card outline-none transition-colors ${errors.property ? "border-danger" : "border-line focus:border-green-soft"}`}
                      required
                    />
                    {errors.property && <p className="font-sans text-[10px] text-danger mt-1">{errors.property}</p>}
                  </div>
                )}

                {serverState?.error && (
                  <div className="p-3 rounded-[var(--radius-md)] bg-danger/5 border border-danger/20">
                    <p className="font-sans text-xs text-danger font-medium">{serverState.error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={pending || submitted}
                  className="w-full py-3 rounded-[var(--radius-sm)] bg-brass text-soft font-sans text-sm font-semibold transition-all hover:bg-brass-dark disabled:opacity-50 disabled:cursor-wait cursor-pointer border-none"
                >
                  {pending || submitted ? "Submitting…" : role === "owner" ? "Apply as owner" : "Apply as operator"}
                </button>
              </form>

              <p className="font-sans text-xs text-mute text-center mt-5">
                Already have an account?{" "}
                <Link href="/login" onClick={onClose} className="text-green-soft hover:text-brass-dark transition-colors font-medium no-underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
