import "server-only";
import crypto from "node:crypto";

/**
 * WhatsApp Business (Meta Cloud API) — PRD 8.
 * Outbound notifications + inbound command webhook.
 *
 * MOCK MODE: without WHATSAPP_ACCESS_TOKEN, sends are logged to the audit
 * trail instead of dispatched, so the whole inspection/booking loop is
 * testable locally.
 */

const GRAPH = "https://graph.facebook.com/v22.0";
const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN ?? "";
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";

export const whatsappConfigured = Boolean(TOKEN && PHONE_ID);

/** PRD 8.5 — inbound webhook signature verification (X-Hub-Signature-256). */
export function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return true; /* mock mode — skip verification */
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const given = signatureHeader.slice(7);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(given, "hex"));
  } catch {
    return false;
  }
}

/* ---------- Templates ---------- */

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

/**
 * Outbound notification. Sends a text message (works within 24h of inbound message).
 * For business-initiated sends outside the 24h window, use Meta templates via
 * `sendWhatsAppTemplate` instead.
 */
export async function sendWhatsApp(phoneNumber: string, message: string): Promise<boolean> {
  if (!whatsappConfigured) {
    console.log(`[mock whatsapp] to ${phoneNumber}: ${message}`);
    return true;
  }
  const res = await fetch(`${GRAPH}/${PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phoneNumber,
      type: "text",
      text: { body: message },
    }),
  });
  return res.ok;
}

/**
 * Outbound template message for business-initiated sends.
 * `template` = registered template name; `params` fill its variables in order.
 */
export async function sendWhatsAppTemplate(
  toE164: string,
  template: string,
  params: string[],
) {
  if (!whatsappConfigured) {
    console.log(`[whatsapp:mock] -> ${toE164} :: ${template} :: ${params.join(" | ")}`);
    return { mock: true };
  }
  const res = await fetch(`${GRAPH}/${PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toE164,
      type: "template",
      template: {
        name: template,
        language: { code: "en_GB" },
        components: [
          { type: "body", parameters: params.map((text) => ({ type: "text", text })) },
        ],
      },
    }),
  });
  if (!res.ok) throw new Error(`whatsapp send failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/**
 * Fetch a media file from Meta's media API (two-step, PRD 8.6):
 *   1. GET /{media-id}        -> { url, mime_type }   (temporary, expires fast)
 *   2. GET that url + bearer  -> the bytes
 * MOCK MODE: returns a tiny placeholder so the DAMAGE photo flow is testable.
 */
export async function fetchWhatsAppMedia(
  mediaId: string,
): Promise<{ bytes: Uint8Array; mime: string }> {
  if (!whatsappConfigured) {
    console.log(`[whatsapp:mock] fetch media ${mediaId}`);
    return { bytes: new Uint8Array([0xff, 0xd8, 0xff]), mime: "image/jpeg" };
  }
  const meta = await fetch(`${GRAPH}/${mediaId}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!meta.ok) throw new Error(`media lookup failed: ${meta.status}`);
  const { url, mime_type } = (await meta.json()) as { url: string; mime_type: string };
  const file = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!file.ok) throw new Error(`media download failed: ${file.status}`);
  return { bytes: new Uint8Array(await file.arrayBuffer()), mime: mime_type };
}

// ---------------------------------------------------------------------------
// Strict command parser (PRD 8.5: malformed requests rejected, never guessed)
// ---------------------------------------------------------------------------

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

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

/** "15-20 Sept" within an optionally specified year → ISO range [start, end] */
function parseDateRange(text: string): { from: string; to: string } | null {
  const m = text.match(/^(\d{1,2})\s*[-–]\s*(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?$/i);
  if (!m) return null;
  const mon = MONTHS[m[3].toLowerCase()];
  if (!mon) return null;
  const now = new Date();
  let year = m[4] ? Number(m[4]) : now.getFullYear();
  if (!m[4] && mon < now.getMonth() + 1) year += 1; // bare "15-20 Jan" in Nov means next year
  const d1 = Number(m[1]);
  const d2 = Number(m[2]);
  if (d1 < 1 || d2 <= d1 || d2 > 31) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    from: `${year}-${pad(mon)}-${pad(d1)}`,
    to: `${year}-${pad(mon)}-${pad(d2)}`,
  };
}

export function parseOwnerCommand(body: string): OwnerCommand | null {
  const text = body.trim().replace(/\s+/g, " ");
  const upper = text.toUpperCase();

  if (upper === "BOOKINGS") return { kind: "BOOKINGS" };
  if (upper === "HELP") return { kind: "HELP" };

  const block = text.match(/^(BLOCK|UNBLOCK)\s+(\d{1,2}\s*[-–]\s*\d{1,2}\s+[A-Za-z]+(?:\s+\d{4})?)\s+(.+)$/i);
  if (block) {
    const range = parseDateRange(block[2]);
    if (!range) return { kind: "INCOMPLETE", command: block[1].toUpperCase(), usage: `${block[1].toUpperCase()} <dates> <unit>\nExample: ${block[1].toUpperCase()} 15-20 Sept Sunset Dove` };
    return {
      kind: block[1].toUpperCase() as "BLOCK" | "UNBLOCK",
      from: range.from,
      to: range.to,
      unit: block[3].trim(),
    };
  }

  /* BLOCK/UNBLOCK typed alone or with insufficient args */
  if (upper === "BLOCK" || upper === "UNBLOCK" || /^(BLOCK|UNBLOCK)\s/i.test(text)) {
    const cmd = upper.startsWith("BLOCK") ? "BLOCK" : upper.startsWith("UNBLOCK") ? "UNBLOCK" : text.split(/\s+/)[0].toUpperCase();
    return { kind: "INCOMPLETE", command: cmd, usage: `${cmd} <dates> <unit>\nExample: ${cmd} 15-20 Sept Sunset Dove` };
  }

  const avail = text.match(/^AVAILABILITY\s+(.+)\s+([A-Za-z]+)$/i);
  if (avail && MONTHS[avail[2].toLowerCase()]) {
    return { kind: "AVAILABILITY", unit: avail[1].trim(), month: avail[2] };
  }

  /* AVAILABILITY typed alone or with only a unit */
  if (upper === "AVAILABILITY" || /^AVAILABILITY\s/i.test(text)) {
    return { kind: "INCOMPLETE", command: "AVAILABILITY", usage: "AVAILABILITY <unit> <month>\nExample: AVAILABILITY Sunset Dove Sept" };
  }

  return null; // strict: anything else is rejected
}

export function parseOperatorCommand(body: string): OperatorCommand | null {
  const text = body.trim().replace(/\s+/g, " ");
  const upper = text.toUpperCase();

  if (["CLEAN", "DAMAGE", "NOSHOW", "GUESTPRESENT", "YES"].includes(upper)) {
    return { kind: upper as OperatorCommand["kind"] } as OperatorCommand;
  }

  const re = text.match(/^REASSIGN\s+(.+)$/i);
  if (re) return { kind: "REASSIGN", rep: re[1].trim() };

  return null;
}
