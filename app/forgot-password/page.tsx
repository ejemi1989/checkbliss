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
        className="forgot-password-image-panel"
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
          <div style={{ textAlign: "center", marginBottom: 40 }} className="forgot-password-mobile-logo">
            <Link href="/" style={{ textDecoration: "none" }}>
              <img src="/assets/images/logo/Logo.png" alt="CheckinBliss" style={{ height: 28, width: "auto", margin: "0 auto" }} />
            </Link>
          </div>

          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#6A6E63", marginBottom: 8 }}>Reset password</p>
            <h1 style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontSize: "clamp(26px, 3vw, 34px)", fontWeight: 500, lineHeight: 1.15, color: "#171915", margin: 0 }}>Forgot your password?</h1>
            <p style={{ fontSize: 14, color: "#44483D", marginTop: 8 }}>
              Enter your email and we&rsquo;ll send you a link to choose a new password.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#6A6E63", marginBottom: 6 }}>Email address</label>
              <input
                id="email"
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="you@email.com"
                style={{ width: "100%", border: "1px solid #D8DBCF", borderRadius: 8, padding: "12px 16px", fontSize: 14, color: "#171915", backgroundColor: "#FCFDFB", outline: "none" }}
              />
            </div>

            {error && (
              <div style={{ padding: "10px 14px", borderRadius: 8, backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}>
                <p style={{ fontSize: 13, color: "#EF4444", fontWeight: 600 }}>{error}</p>
              </div>
            )}
            {success && (
              <div style={{ padding: "10px 14px", borderRadius: 8, backgroundColor: "rgba(47,61,44,0.06)", border: "1px solid rgba(47,61,44,0.15)" }}>
                <p style={{ fontSize: 13, color: "#2F3D2C", fontWeight: 600 }}>{success}</p>
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
              {pending ? "Sending\u2026" : "Send reset link"}
            </button>
          </form>

          <div style={{ marginTop: 32, textAlign: "center", display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 12, color: "#6A6E63" }}>
              Remembered it?{" "}
              <Link href="/login" style={{ color: "#5C6B4F", fontWeight: 600, textDecoration: "none" }}>
                Back to sign in
              </Link>
            </p>
            <Link href="/" style={{ fontSize: 12, color: "#5C6B4F", textDecoration: "none" }}>
              &larr; Back to home
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .forgot-password-image-panel { display: block !important; }
          .forgot-password-mobile-logo { display: none !important; }
        }
      `}</style>
    </div>
  );
}
