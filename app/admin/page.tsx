import type { Metadata } from "next";
import { getSession } from "@/actions/auth";
import { checkAdminGate, adminGateConfigured as isAdminGateConfigured, adminGateBypassed } from "@/lib/admin-gate";
import { AdminDashboard } from "./client";

export function generateMetadata(): Metadata {
  return { robots: { index: false, follow: false } };
}

export default async function AdminPage() {
  const user = await getSession();
  const gate = await checkAdminGate();
  if (!gate.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas px-6">
        <div className="max-w-md w-full bg-card border border-line rounded-[var(--radius-lg)] p-8 text-center">
          <h1 className="font-display text-2xl text-ink mb-2">Admin access required</h1>
          <p className="text-sm text-ink-secondary mb-4">
            {isAdminGateConfigured()
              ? "Provide the admin key in the x-admin-key request header (or via /admin?admin_key=...) to unlock the dashboard."
              : adminGateBypassed()
                ? "Mock mode is active. Set ADMIN_DASH_KEY in production to enforce."
                : "ADMIN_DASH_KEY is not configured. Set it in your environment to access the admin dashboard."}
          </p>
          <p className="text-xs text-mute font-mono break-all">reason: {gate.reason}</p>
        </div>
      </div>
    );
  }
  return <AdminDashboard user={user} />;
}
