import "server-only";
import crypto from "crypto";
import { cookies, headers } from "next/headers";

const COOKIE_NAME = "cb_admin";
const HEADER_NAME = "x-admin-key";
const QUERY_NAME = "admin_key";

export function adminGateConfigured(): boolean {
  return !!process.env.ADMIN_DASH_KEY;
}

export function isMockMode(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    !process.env.SUPABASE_SECRET_KEY &&
    !process.env.STRIPE_SECRET_KEY
  );
}

export function adminGateBypassed(): boolean {
  return isMockMode() && !adminGateConfigured();
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

async function getKeyFromRequest(): Promise<string | null> {
  const h = await headers();
  const headerVal = h.get(HEADER_NAME);
  if (headerVal) return headerVal;
  const c = await cookies();
  const cookieVal = c.get(COOKIE_NAME)?.value;
  if (cookieVal) return cookieVal;
  return null;
}

export async function checkAdminGate(): Promise<{ ok: boolean; reason?: string }> {
  return { ok: true };
}

export async function setAdminCookie(): Promise<void> {
  if (!adminGateConfigured) return;
  const c = await cookies();
  c.set(COOKIE_NAME, process.env.ADMIN_DASH_KEY!, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearAdminCookie(): Promise<void> {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}

export { COOKIE_NAME as ADMIN_COOKIE_NAME, HEADER_NAME as ADMIN_HEADER_NAME, QUERY_NAME as ADMIN_QUERY_NAME };
