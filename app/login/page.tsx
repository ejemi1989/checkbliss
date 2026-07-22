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
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      {/* Image panel */}
      <div
        style={{
          display: "none",
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#171915",
          flex: "0 0 42%",
        }}
        className="login-image-panel"
      >
        <img
          src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80"
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
            <p style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontStyle: "italic", fontSize: "clamp(20px, 2.2vw, 28px)", color: "rgba(255,255,255,0.88)", lineHeight: 1.45, marginBottom: 16, maxWidth: 380 }}>
              &ldquo;The premium way to stay in Africa&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#E9ECE2", padding: "40px 24px" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          {/* Mobile logo */}
          <div style={{ textAlign: "center", marginBottom: 40 }} className="login-mobile-logo">
            <Link href="/" style={{ textDecoration: "none" }}>
              <img src="/assets/images/logo/Logo.png" alt="CheckinBliss" style={{ height: 28, width: "auto", margin: "0 auto" }} />
            </Link>
          </div>

          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#6A6E63", marginBottom: 8 }}>Welcome back</p>
            <h1 style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontSize: "clamp(26px, 3vw, 34px)", fontWeight: 500, lineHeight: 1.15, color: "#171915", margin: 0 }}>Sign in to your account</h1>
            <p style={{ fontSize: 14, color: "#44483D", marginTop: 8 }}>Access your dashboard, bookings, and properties.</p>
          </div>

          <form action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#6A6E63", marginBottom: 6 }}>Email address</label>
              <input
                type="email"
                name="email"
                placeholder="you@email.com"
                defaultValue={fillEmail}
                style={{ width: "100%", border: "1px solid #D8DBCF", borderRadius: 8, padding: "12px 16px", fontSize: 14, color: "#171915", backgroundColor: "#FCFDFB", outline: "none" }}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#6A6E63", marginBottom: 6 }}>Password</label>
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                style={{ width: "100%", border: "1px solid #D8DBCF", borderRadius: 8, padding: "12px 16px", fontSize: 14, color: "#171915", backgroundColor: "#FCFDFB", outline: "none" }}
                required
              />
            </div>

            {error && (
              <div style={{ padding: "10px 14px", borderRadius: 8, backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}>
                <p style={{ fontSize: 13, color: "#EF4444", fontWeight: 600 }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              style={{
                width: "100%", padding: "14px 0", borderRadius: 6, backgroundColor: pending ? "rgba(47,61,44,0.6)" : "#2F3D2C",
                color: "#F4F6F0", fontSize: 15, fontWeight: 600, border: "none", cursor: pending ? "wait" : "pointer",
                transition: "background-color 0.2s",
              }}
            >
              {pending ? "Signing in\u2026" : "Sign in"}
            </button>
          </form>

          {/* Demo access */}
          <div style={{ marginTop: 32 }}>
            <div style={{ position: "relative", marginBottom: 24 }}>
              <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, backgroundColor: "#D8DBCF" }} />
              <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
                <span style={{ backgroundColor: "#E9ECE2", padding: "0 16px", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#6A6E63" }}>Demo access</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {CREDENTIALS.map((c) => {
                const active = fillEmail === c.email;
                return (
                  <button
                    key={c.email}
                    type="button"
                    onClick={() => setFillEmail(c.email)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                      borderRadius: 8, fontSize: 13, cursor: "pointer", border: `1px solid ${active ? "#2F3D2C" : "#D8DBCF"}`,
                      backgroundColor: active ? "rgba(47,61,44,0.06)" : "#FCFDFB", color: active ? "#171915" : "#44483D",
                      textAlign: "left", transition: "border-color 0.15s, background-color 0.15s",
                    }}
                  >
                    <span style={{
                      width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 700, flexShrink: 0,
                      backgroundColor: active ? "#2F3D2C" : "#F4F6F0", color: active ? "#F4F6F0" : "#6A6E63",
                    }}>
                      {c.role[0]}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{c.role}</div>
                      <div style={{ fontSize: 11, opacity: 0.55, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{c.email}</div>
                      <div style={{ fontSize: 10, opacity: 0.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{c.sub}</div>
                    </div>
                    <span style={{ marginLeft: "auto", fontSize: 10, fontFamily: "monospace", opacity: 0.35, flexShrink: 0 }}>checkbliss-demo-2026</span>
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 10, color: "#6A6E63", textAlign: "center", marginTop: 12 }}>
              Click a role to pre-fill. Password is <span style={{ color: "#44483D", fontWeight: 600 }}>checkbliss-demo-2026</span> for all.
            </p>
          </div>

          <div style={{ marginTop: 32, textAlign: "center", display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 12, color: "#6A6E63" }}>
              Don&rsquo;t have an account?{" "}
              <Link href="/signup" style={{ color: "#5C6B4F", fontWeight: 600, textDecoration: "none" }}>Get started</Link>
            </p>
            <Link href="/" style={{ fontSize: 12, color: "#5C6B4F", textDecoration: "none" }}>
              &larr; Back to home
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .login-image-panel { display: block !important; }
          .login-mobile-logo { display: none !important; }
        }
      `}</style>
    </div>
  );
}
