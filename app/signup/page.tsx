"use client";

import { useState } from "react";
import Link from "next/link";

type Role = "operator" | "owner";

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  property?: string;
}

export default function SignupPage() {
  const [pending, setPending] = useState(false);
  const [serverState, setServerState] = useState<{ success?: boolean; role?: string; message?: string; error?: string } | null>(null);
  const [role, setRole] = useState<Role>("owner");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  function validate(formData: FormData): boolean {
    const errs: FormErrors = {};
    if (!formData.get("name")) errs.name = "Required";
    if (!formData.get("email")) errs.email = "Required";
    if (!formData.get("phone")) errs.phone = "Required";
    if (role === "operator" && !formData.get("city")) errs.city = "Required";
    if (role === "owner" && !formData.get("property")) errs.property = "Required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!validate(fd)) return;
    setPending(true);
    setServerState(null);
    // Mock signup — always succeeds
    await new Promise((r) => setTimeout(r, 800));
    setServerState({ success: true, role, message: "Account created (demo mode)." });
    setPending(false);
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen flex">
      {/* Image panel */}
      <div className="hidden lg:block lg:w-5/12 xl:w-1/2 relative overflow-hidden bg-ink">
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80"
          alt="Abuja apartment interior"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-ink/70 via-ink/30 to-transparent" />

        <div className="relative z-10 flex flex-col justify-between h-full p-12 xl:p-16">
          <Link href="/" className="no-underline">
            <img src="/checkbliss%20logo.png" alt="CheckinBliss" className="h-7 w-auto brightness-0 invert" />
          </Link>

          <div className="pb-8">
            <p className="font-display italic text-[clamp(18px,2vw,28px)] text-white/85 leading-relaxed mb-3 max-w-[420px]">
              List your property or help us verify apartments in Lagos &amp; Abuja.
            </p>
            <p className="font-sans text-sm text-white/55 leading-relaxed max-w-[380px]">
              Join the platform built for the diaspora. Every apartment inspected in person. Every owner paid in their currency.
            </p>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center bg-bone px-6 py-10 lg:px-12 xl:px-20">
        <div className="w-full max-w-[440px]">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="no-underline inline-block">
              <img src="/checkbliss%20logo.png" alt="CheckinBliss" className="h-7 w-auto" />
            </Link>
          </div>

          {serverState?.success ? (
            /* Success state */
            <div className="text-center">
              <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-brass/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-brass" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="font-display text-[clamp(1.6rem,2.5vw,2rem)] font-medium text-ink mb-2">Account requested</h2>
              <p className="font-sans text-sm text-ink-secondary mb-6 max-w-[360px] mx-auto">
                We&rsquo;ll review your {serverState.role === "operator" ? "operator" : "owner"} application and get back to you within 24 hours.
              </p>
              <Link
                href="/login"
                className="inline-block px-8 py-3.5 rounded-[var(--radius-sm)] bg-brass text-soft font-sans text-[15px] font-semibold no-underline transition-all hover:bg-brass-dark"
              >
                Go to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-mute mb-2">Get started</p>
                <h1 className="font-display text-[clamp(1.8rem,3vw,2.4rem)] font-medium leading-tight text-ink">Create your account</h1>
                <p className="font-sans text-sm text-ink-secondary mt-2">Join as an operator or property owner.</p>
              </div>

              {/* Google sign-up */}
              <button
                type="button"
                className="w-full flex items-center justify-center gap-3 py-3 mb-8 rounded-[var(--radius-md)] border border-line bg-card font-sans text-[14px] font-medium text-ink-secondary hover:border-green-soft hover:text-ink transition-all cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div className="relative mb-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-line" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-bone px-4 font-sans text-mute">or with email</span>
                </div>
              </div>

              {/* Role selector */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                <button
                  type="button"
                  onClick={() => { setRole("owner"); setErrors({}); }}
                  className={`p-4 rounded-[var(--radius-md)] border text-left cursor-pointer transition-all ${
                    role === "owner"
                      ? "border-brass bg-brass/5"
                      : "border-line bg-card hover:border-green-soft"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${
                    role === "owner" ? "bg-brass text-soft" : "bg-soft text-mute"
                  }`}>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  </div>
                  <div className="font-sans text-sm font-semibold text-ink">Property Owner</div>
                  <div className="font-sans text-[11px] text-mute mt-1">List your apartments and earn</div>
                </button>

                <button
                  type="button"
                  onClick={() => { setRole("operator"); setErrors({}); }}
                  className={`p-4 rounded-[var(--radius-md)] border text-left cursor-pointer transition-all ${
                    role === "operator"
                      ? "border-brass bg-brass/5"
                      : "border-line bg-card hover:border-green-soft"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${
                    role === "operator" ? "bg-brass text-soft" : "bg-soft text-mute"
                  }`}>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="font-sans text-sm font-semibold text-ink">Operator</div>
                  <div className="font-sans text-[11px] text-mute mt-1">Verify and inspect properties</div>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input type="hidden" name="role" value={role} />

                <div>
                  <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute block mb-1.5">Full name</label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Your full name"
                    className={`w-full border rounded-[var(--radius-md)] px-4 py-3 text-[15px] font-sans text-ink bg-card outline-none transition-colors ${
                      errors.name ? "border-danger" : "border-line focus:border-green-soft"
                    }`}
                    required
                  />
                  {errors.name && <p className="font-sans text-[10px] text-danger mt-1">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                  <div>
                    <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute block mb-1.5">Email address</label>
                    <input
                      type="email"
                      name="email"
                      placeholder="you@email.com"
                      className={`w-full border rounded-[var(--radius-md)] px-4 py-3 text-[15px] font-sans text-ink bg-card outline-none transition-colors ${
                        errors.email ? "border-danger" : "border-line focus:border-green-soft"
                      }`}
                      required
                    />
                    {errors.email && <p className="font-sans text-[10px] text-danger mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute block mb-1.5">Phone number</label>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="+234 800 000 0000"
                      className={`w-full border rounded-[var(--radius-md)] px-4 py-3 text-[15px] font-sans text-ink bg-card outline-none transition-colors ${
                        errors.phone ? "border-danger" : "border-line focus:border-green-soft"
                      }`}
                      required
                    />
                    {errors.phone && <p className="font-sans text-[10px] text-danger mt-1">{errors.phone}</p>}
                  </div>
                </div>

                {/* Role-specific fields */}
                {role === "operator" && (
                  <div>
                    <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute block mb-1.5">Assigned city</label>
                    <select
                      name="city"
                      defaultValue=""
                      className={`w-full border rounded-[var(--radius-md)] px-4 py-3 text-[15px] font-sans text-ink bg-card outline-none appearance-none cursor-pointer transition-colors ${
                        errors.city ? "border-danger" : "border-line focus:border-green-soft"
                      }`}
                      required
                    >
                      <option value="" disabled>Select a city</option>
                      <option value="Lagos">Lagos</option>
                      <option value="Abuja">Abuja</option>
                      <option value="Port Harcourt">Port Harcourt</option>
                    </select>
                    {errors.city && <p className="font-sans text-[10px] text-danger mt-1">{errors.city}</p>}
                  </div>
                )}

                {role === "owner" && (
                  <>
                    <div>
                      <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute block mb-1.5">Property name or address</label>
                      <input
                        type="text"
                        name="property"
                        placeholder="e.g. The Palms, Victoria Island"
                        className={`w-full border rounded-[var(--radius-md)] px-4 py-3 text-[15px] font-sans text-ink bg-card outline-none transition-colors ${
                          errors.property ? "border-danger" : "border-line focus:border-green-soft"
                        }`}
                        required
                      />
                      {errors.property && <p className="font-sans text-[10px] text-danger mt-1">{errors.property}</p>}
                    </div>
                    <div>
                      <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute block mb-1.5">How many properties do you own?</label>
                      <select
                        name="propertyCount"
                        defaultValue="1"
                        className="w-full border border-line rounded-[var(--radius-md)] px-4 py-3 text-[15px] font-sans text-ink bg-card outline-none appearance-none cursor-pointer focus:border-green-soft transition-colors"
                      >
                        <option value="1">1 property</option>
                        <option value="2">2–4 properties</option>
                        <option value="5">5–10 properties</option>
                        <option value="10">10+ properties</option>
                      </select>
                    </div>
                  </>
                )}

                {serverState?.error && (
                  <div className="p-3 rounded-[var(--radius-md)] bg-danger/5 border border-danger/20">
                    <p className="font-sans text-xs text-danger font-medium">{serverState.error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={pending || submitted}
                  className="w-full py-3.5 rounded-[var(--radius-sm)] bg-brass text-soft font-sans text-[15px] font-semibold transition-all hover:bg-brass-dark disabled:opacity-50 disabled:cursor-wait cursor-pointer border-none"
                >
                  {pending || submitted ? "Submitting…" : role === "owner" ? "Apply as owner" : "Apply as operator"}
                </button>
              </form>

              <p className="font-sans text-xs text-mute text-center mt-6">
                Already have an account?{" "}
                <Link href="/login" className="text-green-soft hover:text-brass-dark transition-colors font-medium no-underline">
                  Sign in
                </Link>
              </p>

              <div className="mt-6 text-center">
                <Link href="/" className="font-sans text-xs text-green-soft hover:text-brass-dark transition-colors no-underline">
                  &larr; Back to home
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
