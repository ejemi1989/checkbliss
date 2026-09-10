#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * dev-mock — force CheckinBliss into mock mode for local dashboard testing.
 *
 * A populated `.env` (real Supabase + Stripe credentials) forces the app into
 * real mode, which silently breaks the demo logins (admin@checkbliss.com,
 * owner@checkbliss.com, operator-*@..., guest@...) because those users don't
 * exist in real Supabase Auth — so dashboards appear "missing" (you get bounced
 * to /login).
 *
 * This runs `next dev` with the credential keys blanked via a transient
 * `.env.local` override (`.env.local` takes precedence over `.env`; Next.js
 * otherwise reloads `.env` and re-populates the keys, which is why plain
 * `env VAR= npm run dev` does NOT switch real→mock in Next 16).
 *
 * Usage: `npm run dev:mock`
 */

const root = fileURLToPath(new URL("..", import.meta.url));

const BLANK_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PK",
  "WHATSAPP_APP_SECRET",
  "WHATSAPP_ACCESS_TOKEN",
  "FINCRA_API_KEY",
  "FINCRA_WEBHOOK_SECRET",
];

function writeOverride() {
  const content = "\n" + BLANK_KEYS.map((k) => `${k}=`).join("\n") + "\n";
  writeFileSync(path.join(root, ".env.local"), content, "utf8");
}

function restore() {
  const envLocal = path.join(root, ".env.local");
  if (existsSync(envLocal)) {
    // Only delete if it's exactly what we wrote (all blanked lines).
    const current = readFileSync(envLocal, "utf8");
    const ours = (line) => line === "" || BLANK_KEYS.some((k) => line.trim() === `${k}=`);
    const isOurs = current.split("\n").every(ours);
    if (isOurs) unlinkSync(envLocal);
  }
}

function onExit() {
  restore();
  process.exit(0);
}

writeOverride();
console.log("[dev:mock] Supabase/Stripe keys blanked via .env.local — mock mode active.\n");

const child = spawn(
  "npm",
  ["run", "dev", "--", ...process.argv.slice(2)],
  { stdio: "inherit", cwd: root, env: process.env },
);

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
process.on("exit", onExit);
child.on("close", (code) => {
  restore();
  process.exit(code ?? 0);
});
