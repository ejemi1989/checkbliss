import crypto from "crypto";

export const whatsappConfigured = !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

/* ---------- Signature verification ---------- */
export function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true; /* mock mode — skip verification */

  const sig = (signatureHeader ?? "").replace("sha256=", "");
  if (!sig) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}

const TEMPLATES = {
  newBooking: (unit: string, guest: string, checkIn: string, checkOut: string, total: string) =>
    `✓ New booking: ${unit}, ${checkIn}–${checkOut}, total ${total}. Guest: ${guest}.`,
  preCheckout: (unit: string, guest: string, time: string) =>
    `Reminder: ${guest} checking out tomorrow from ${unit} at ${time}. Inspection scheduled.`,
  checkoutClean: (unit: string, payoutDate: string) =>
    `✓ Checkout clean — ${unit}. No damage reported. Payout on schedule for ${payoutDate}.`,
  checkoutDamage: (unit: string) =>
    `⚠ Damage reported — ${unit}. Operator filing claim. Update within 24–48 hours.`,
  damageResolution: (unit: string, amount: string, note: string) =>
    `Damage claim resolved — ${unit}. ${amount} captured for ${note}, added to next payout.`,
  payoutProcessed: (amount: string, period: string) =>
    `✓ Payout processed: ${amount} to your account for the week ending ${period}. Statement available in dashboard.`,
  verificationScheduled: (unit: string, date: string, timeWindow: string) =>
    `Monthly verification scheduled for ${unit} on ${date}. Operator will visit between ${timeWindow}.`,
  verificationFailed: (unit: string) =>
    `⚠ Verification flagged issues at ${unit}. Listing temporarily suspended pending remediation. Operator will contact you.`,
} as const;

export function getTemplate(name: keyof typeof TEMPLATES, ...args: Parameters<(typeof TEMPLATES)[typeof name]>): string {
  const fn = TEMPLATES[name] as (...a: string[]) => string;
  return fn(...args);
}

export async function sendWhatsApp(phoneNumber: string, message: string): Promise<boolean> {
  if (!whatsappConfigured) {
    console.log(`[mock whatsapp] to ${phoneNumber}: ${message}`);
    return true;
  }
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const token = process.env.WHATSAPP_ACCESS_TOKEN!;
  const res = await fetch(
    `https://graph.facebook.com/v22.0/${phoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "text",
        text: { body: message },
      }),
    },
  );
  return res.ok;
}

/* ---------- Command Parsers ---------- */

export type OwnerCommand =
  | { kind: "BLOCK"; unit: string; from: string; to: string }
  | { kind: "UNBLOCK"; unit: string; from: string; to: string }
  | { kind: "AVAILABILITY"; unit: string; month: string }
  | { kind: "BOOKINGS" }
  | { kind: "HELP" }
  | { kind: "INCOMPLETE"; command: string; usage: string };

export type OperatorCommand =
  | { kind: "CLEAN" }
  | { kind: "DAMAGE" }
  | { kind: "NOSHOW" }
  | { kind: "GUESTPRESENT" }
  | { kind: "YES" }
  | { kind: "REASSIGN"; rep: string };

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "sept", "oct", "nov", "dec"];

function parseDateRange(text: string): { from: string; to: string } | null {
  const cleaned = text.replace(/,/g, "").trim();
  const match = cleaned.match(/^(\d{1,2})\s*[-–]\s*(\d{1,2})\s+([a-z]{3,})(?:\s+(\d{4}))?/i);
  if (!match) return null;
  const day1 = match[1].padStart(2, "0");
  const day2 = match[2].padStart(2, "0");
  const monthStr = match[3].toLowerCase();
  const year = match[4] ?? String(new Date().getFullYear());

  const monthIdx = MONTHS.findIndex((m) => m === monthStr || monthStr.startsWith(m));
  if (monthIdx < 0) return null;
  const mo = String(monthIdx + 1).padStart(2, "0");

  return {
    from: `${year}-${mo}-${day1}`,
    to: `${year}-${mo}-${day2}`,
  };
}

export function parseOwnerCommand(body: string): OwnerCommand | null {
  const text = body.trim();

  const upper = text.toUpperCase();
  if (upper === "HELP") return { kind: "HELP" };
  if (upper === "BOOKINGS") return { kind: "BOOKINGS" };

  const blockMatch = text.match(/^(BLOCK|UNBLOCK)\s+(.+)/i);
  if (blockMatch) {
    const kind = blockMatch[1].toUpperCase() as "BLOCK" | "UNBLOCK";
    const rest = blockMatch[2].trim();
    const parts = rest.split(/\s+/);

    /* try 4-part then 3-part date range (with/without year) */
    for (const n of [4, 3]) {
      if (parts.length <= n) continue;
      const range = parts.slice(0, n).join(" ");
      const unit = parts.slice(n).join(" ");
      const dates = parseDateRange(range);
      if (dates && unit) return { kind, unit, from: dates.from, to: dates.to };
    }

    return { kind: "INCOMPLETE", command: kind, usage: `${kind} <dates> <unit>\nExample: ${kind} 15-20 Sept Sunset Dove` };
  }

  /* BLOCK/UNBLOCK typed alone */
  if (upper === "BLOCK" || upper === "UNBLOCK") {
    return { kind: "INCOMPLETE", command: upper, usage: `${upper} <dates> <unit>\nExample: ${upper} 15-20 Sept Sunset Dove` };
  }

  const availMatch = text.match(/^AVAILABILITY\s+(.+)\s+(.+)$/i);
  if (availMatch) {
    return { kind: "AVAILABILITY", unit: availMatch[1].trim(), month: availMatch[2].trim() };
  }

  /* AVAILABILITY typed alone or with only a unit */
  if (upper === "AVAILABILITY" || /^AVAILABILITY\s/i.test(text)) {
    return { kind: "INCOMPLETE", command: "AVAILABILITY", usage: "AVAILABILITY <unit> <month>\nExample: AVAILABILITY Sunset Dove Sept" };
  }

  return null;
}

export function parseOperatorCommand(body: string): OperatorCommand | null {
  const upper = body.trim().toUpperCase();

  if (upper === "CLEAN") return { kind: "CLEAN" };
  if (upper === "DAMAGE") return { kind: "DAMAGE" };
  if (upper === "NOSHOW") return { kind: "NOSHOW" };
  if (upper === "GUESTPRESENT") return { kind: "GUESTPRESENT" };
  if (upper === "YES") return { kind: "YES" };

  const reassignMatch = upper.match(/^REASSIGN\s+(.+)$/i);
  if (reassignMatch) return { kind: "REASSIGN", rep: reassignMatch[1].trim() };

  return null;
}
