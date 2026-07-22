"use client";

import { useState } from "react";
import Link from "next/link";
import { DIASPORA_COUNTRIES } from "@/lib/countries";
import { signupAction } from "@/actions/auth";

type Role = "operator" | "owner";

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  city?: string;
  property?: string;
  country?: string;
}

export default function SignupPage() {
  const [pending, setPending] = useState(false);
  const [serverState, setServerState] = useState<{ success?: boolean; role?: string; message?: string; error?: string } | null>(null);
  const [role, setRole] = useState<Role>("owner");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [verifyMethod, setVerifyMethod] = useState<"id" | "flight" | null>(null);

  function validate(fd: FormData): boolean {
    const e: FormErrors = {};
    if (!fd.get("name")) e.name = "Required";
    if (!fd.get("email")) e.email = "Required";
    if (!fd.get("phone")) e.phone = "Required";
    const pw = fd.get("password") as string;
    if (!pw) e.password = "Required";
    else if (pw.length < 8) e.password = "At least 8 characters";
    if (!fd.get("country")) e.country = "Required";
    if (role === "operator" && !fd.get("city")) e.city = "Required";
    if (role === "owner" && !fd.get("property")) e.property = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    if (!validate(fd)) return;
    setPending(true);
    setServerState(null);
    try {
      const result = await signupAction(null, fd);
      if (result?.error) {
        setServerState({ error: result.error });
      } else {
        setServerState({ success: true, role, message: result?.message || "Account created." });
        setSubmitted(true);
      }
    } catch {
      setServerState({ error: "Something went wrong. Please try again." });
    }
    setPending(false);
  }

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: "100%", border: `1px solid ${hasError ? "#EF4444" : "#D8DBCF"}`, borderRadius: 8,
    padding: "12px 16px", fontSize: 14, color: "#171915", backgroundColor: "#FCFDFB", outline: "none",
  });

  const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#6A6E63", marginBottom: 6 };

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      {/* Image panel */}
      <div
        style={{
          display: "none", position: "relative", overflow: "hidden",
          backgroundColor: "#171915", flex: "0 0 42%",
        }}
        className="signup-image-panel"
      >
        <img
          src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80"
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(23,25,21,0.75) 0%, rgba(23,25,21,0.25) 50%, rgba(23,25,21,0.65) 100%)" }} />
        <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", padding: "48px 56px" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <img src="/assets/images/logo/Logo.png" alt="CheckinBliss" style={{ height: 32, width: "auto" }} />
          </Link>
          <div style={{ paddingBottom: 32 }}>
            <p style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontStyle: "italic", fontSize: "clamp(18px, 2vw, 26px)", color: "rgba(255,255,255,0.88)", lineHeight: 1.45, marginBottom: 12, maxWidth: 380 }}>
              List your property or help us verify apartments in Lagos &amp; Abuja.
            </p>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, maxWidth: 340 }}>
              Join the platform built for the diaspora. Every apartment inspected in person. Every owner paid in their currency.
            </p>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#E9ECE2", padding: "40px 24px" }}>
        <div style={{ width: "100%", maxWidth: 440 }}>
          {/* Mobile logo */}
          <div style={{ textAlign: "center", marginBottom: 32 }} className="signup-mobile-logo">
            <Link href="/" style={{ textDecoration: "none" }}>
              <img src="/assets/images/logo/Logo.png" alt="CheckinBliss" style={{ height: 28, width: "auto", margin: "0 auto" }} />
            </Link>
          </div>

          {serverState?.success ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: "rgba(47,61,44,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                <svg style={{ width: 28, height: 28, color: "#2F3D2C" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontSize: "clamp(22px, 2.5vw, 28px)", fontWeight: 500, color: "#171915", marginBottom: 8 }}>Account requested</h2>
              <p style={{ fontSize: 14, color: "#44483D", marginBottom: 28, maxWidth: 340, margin: "0 auto 28px" }}>
                We&rsquo;ll review your {serverState.role === "operator" ? "operator" : "owner"} application and get back to you within 24 hours.
              </p>
              <Link href="/login" style={{ display: "inline-block", padding: "14px 32px", borderRadius: 6, backgroundColor: "#2F3D2C", color: "#F4F6F0", fontSize: 15, fontWeight: 600, textDecoration: "none" }}>
                Go to sign in
              </Link>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 32 }}>
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#6A6E63", marginBottom: 8 }}>Get started</p>
                <h1 style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontSize: "clamp(26px, 3vw, 34px)", fontWeight: 500, lineHeight: 1.15, color: "#171915", margin: 0 }}>Create your account</h1>
                <p style={{ fontSize: 14, color: "#44483D", marginTop: 8 }}>Join as an operator or property owner.</p>
              </div>

              {/* Google sign-up */}
              <button
                type="button"
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  padding: "12px 0", marginBottom: 28, borderRadius: 8, border: "1px solid #D8DBCF",
                  backgroundColor: "#FCFDFB", fontSize: 14, fontWeight: 500, color: "#44483D", cursor: "pointer",
                }}
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
              <div style={{ position: "relative", marginBottom: 28 }}>
                <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, backgroundColor: "#D8DBCF" }} />
                <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
                  <span style={{ backgroundColor: "#E9ECE2", padding: "0 16px", fontSize: 12, color: "#6A6E63" }}>or with email</span>
                </div>
              </div>

              {/* Role selector */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 28 }}>
                {(["owner", "operator"] as const).map((r) => {
                  const active = role === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => { setRole(r); setErrors({}); }}
                      style={{
                        padding: 16, borderRadius: 8, border: `1px solid ${active ? "#2F3D2C" : "#D8DBCF"}`,
                        backgroundColor: active ? "rgba(47,61,44,0.06)" : "#FCFDFB",
                        textAlign: "left", cursor: "pointer", transition: "border-color 0.15s, background-color 0.15s",
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10,
                        backgroundColor: active ? "#2F3D2C" : "#F4F6F0", color: active ? "#F4F6F0" : "#6A6E63",
                      }}>
                        {r === "owner" ? (
                          <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                          </svg>
                        ) : (
                          <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        )}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#171915" }}>{r === "owner" ? "Property Owner" : "Operator"}</div>
                      <div style={{ fontSize: 11, color: "#6A6E63", marginTop: 4 }}>{r === "owner" ? "List your apartments and earn" : "Verify and inspect properties"}</div>
                    </button>
                  );
                })}
              </div>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <input type="hidden" name="role" value={role} />

                <div>
                  <label style={labelStyle}>Full name</label>
                  <input type="text" name="name" placeholder="Your full name" style={inputStyle(!!errors.name)} required />
                  {errors.name && <p style={{ fontSize: 10, color: "#EF4444", marginTop: 4 }}>{errors.name}</p>}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Email address</label>
                    <input type="email" name="email" placeholder="you@email.com" style={inputStyle(!!errors.email)} required />
                    {errors.email && <p style={{ fontSize: 10, color: "#EF4444", marginTop: 4 }}>{errors.email}</p>}
                  </div>
                  <div>
                    <label style={labelStyle}>Phone number</label>
                    <input type="tel" name="phone" placeholder="+234 800 000 0000" style={inputStyle(!!errors.phone)} required />
                    {errors.phone && <p style={{ fontSize: 10, color: "#EF4444", marginTop: 4 }}>{errors.phone}</p>}
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Password</label>
                  <input type="password" name="password" placeholder="At least 8 characters" style={inputStyle(!!errors.password)} required minLength={8} />
                  {errors.password && <p style={{ fontSize: 10, color: "#EF4444", marginTop: 4 }}>{errors.password}</p>}
                </div>

                <div>
                  <label style={labelStyle}>Country of residence</label>
                  <select name="country" defaultValue="" style={{ ...inputStyle(!!errors.country), appearance: "none" as const, cursor: "pointer" }} required>
                    <option value="" disabled>Select your country</option>
                    {DIASPORA_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                  {errors.country && <p style={{ fontSize: 10, color: "#EF4444", marginTop: 4 }}>{errors.country}</p>}
                </div>

                {/* Verification notice */}
                <div style={{ padding: 14, borderRadius: 8, backgroundColor: "rgba(92,107,79,0.06)", border: "1px solid rgba(92,107,79,0.15)" }}>
                  <p style={{ fontSize: 13, color: "#44483D", lineHeight: 1.55 }}>
                    <strong style={{ color: "#171915" }}>Diaspora verification required.</strong> We verify your phone number via text message to confirm you are booking from abroad. Flight ticket or government ID may be required for first-time guests.
                  </p>
                </div>

                {/* Verification method */}
                <div>
                  <label style={labelStyle}>Verify with (optional for now)</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {([
                      { id: "id" as const, label: "Government ID", desc: "Passport, driver's license, or national ID" },
                      { id: "flight" as const, label: "Flight ticket", desc: "Upcoming or recent booking confirmation" },
                    ]).map((opt) => {
                      const active = verifyMethod === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setVerifyMethod(active ? null : opt.id)}
                          style={{
                            padding: "12px 14px", borderRadius: 8, border: `1px solid ${active ? "#2F3D2C" : "#D8DBCF"}`,
                            backgroundColor: active ? "rgba(47,61,44,0.06)" : "#FCFDFB",
                            textAlign: "left", cursor: "pointer", transition: "border-color 0.15s",
                          }}
                        >
                          <div style={{
                            width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8,
                            backgroundColor: active ? "#2F3D2C" : "#F4F6F0", color: active ? "#F4F6F0" : "#6A6E63",
                          }}>
                            {opt.id === "id" ? (
                              <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2.5" /><circle cx="12" cy="12" r="2.5" /></svg>
                            ) : (
                              <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>
                            )}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#171915" }}>{opt.label}</div>
                          <div style={{ fontSize: 10, color: "#6A6E63", marginTop: 2 }}>{opt.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                  {verifyMethod && (
                    <div style={{ marginTop: 12 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "#6A6E63", display: "block", marginBottom: 6 }}>
                        Upload {verifyMethod === "id" ? "government-issued ID" : "flight ticket"}
                      </label>
                      <div style={{
                        width: "100%", border: "1px dashed #D8DBCF", borderRadius: 8,
                        padding: "28px 16px", textAlign: "center", backgroundColor: "rgba(244,246,240,0.5)", cursor: "pointer",
                      }}>
                        <input type="file" accept={verifyMethod === "id" ? "image/*,.pdf" : "image/*,.pdf"} style={{ display: "none" }} id="verifyUpload" />
                        <label htmlFor="verifyUpload" style={{ cursor: "pointer", display: "block" }}>
                          <svg style={{ width: 32, height: 32, color: "#6A6E63", margin: "0 auto 8px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                          <span style={{ fontSize: 13, color: "#44483D", fontWeight: 600 }}>
                            Tap to upload
                          </span>
                          <span style={{ fontSize: 11, color: "#6A6E63", display: "block", marginTop: 4 }}>
                            {verifyMethod === "id" ? "Passport, driver's license, or national ID" : "Booking confirmation or e-ticket"}
                          </span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Role-specific fields */}
                {role === "operator" && (
                  <div>
                    <label style={labelStyle}>Assigned city</label>
                    <select name="city" defaultValue="" style={{ ...inputStyle(!!errors.city), appearance: "none" as const, cursor: "pointer" }} required>
                      <option value="" disabled>Select a city</option>
                      <option value="Lagos">Lagos</option>
                      <option value="Abuja">Abuja</option>
                      <option value="Port Harcourt">Port Harcourt</option>
                    </select>
                    {errors.city && <p style={{ fontSize: 10, color: "#EF4444", marginTop: 4 }}>{errors.city}</p>}
                  </div>
                )}

                {role === "owner" && (
                  <>
                    <div>
                      <label style={labelStyle}>Property name or address</label>
                      <input type="text" name="property" placeholder="e.g. The Palms, Victoria Island" style={inputStyle(!!errors.property)} required />
                      {errors.property && <p style={{ fontSize: 10, color: "#EF4444", marginTop: 4 }}>{errors.property}</p>}
                    </div>
                    <div>
                      <label style={labelStyle}>How many properties do you own?</label>
                      <select name="propertyCount" defaultValue="1" style={{ ...inputStyle(), appearance: "none" as const, cursor: "pointer" }}>
                        <option value="1">1 property</option>
                        <option value="2">2–4 properties</option>
                        <option value="5">5–10 properties</option>
                        <option value="10">10+ properties</option>
                      </select>
                    </div>
                  </>
                )}

                {serverState?.error && (
                  <div style={{ padding: "10px 14px", borderRadius: 8, backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}>
                    <p style={{ fontSize: 13, color: "#EF4444", fontWeight: 600 }}>{serverState.error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={pending || submitted}
                  style={{
                    width: "100%", padding: "14px 0", borderRadius: 6,
                    backgroundColor: pending || submitted ? "rgba(47,61,44,0.6)" : "#2F3D2C",
                    color: "#F4F6F0", fontSize: 15, fontWeight: 600, border: "none",
                    cursor: pending || submitted ? "wait" : "pointer", transition: "background-color 0.2s",
                  }}
                >
                  {pending || submitted ? "Submitting\u2026" : role === "owner" ? "Apply as owner" : "Apply as operator"}
                </button>
              </form>

              <p style={{ fontSize: 12, color: "#6A6E63", textAlign: "center", marginTop: 24 }}>
                Already have an account?{" "}
                <Link href="/login" style={{ color: "#5C6B4F", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
              </p>

              <div style={{ marginTop: 24, textAlign: "center" }}>
                <Link href="/" style={{ fontSize: 12, color: "#5C6B4F", textDecoration: "none" }}>
                  &larr; Back to home
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .signup-image-panel { display: block !important; }
          .signup-mobile-logo { display: none !important; }
        }
      `}</style>
    </div>
  );
}
