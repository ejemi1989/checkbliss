import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { createHmac } from "crypto";
import { GET, POST } from "@/app/api/webhooks/whatsapp/route";
import { resetMockLedger } from "@/lib/idempotency";

/* Helper: build a mock Meta payload */
function makePayload(from: string, text: string, msgId?: string): Record<string, unknown> {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "102290129340398",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "15550783881",
                phone_number_id: "106540352242922",
              },
              contacts: [{ wa_id: from.replace("+", ""), profile: { name: "Sheena Nelson" } }],
              messages: [
                {
                  from: from.replace("+", ""),
                  id: msgId ?? `wamid.${Date.now()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: "text",
                  text: { body: text },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

function makeImagePayload(from: string, imageId: string, msgId?: string): Record<string, unknown> {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "102290129340398",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "15550783881",
                phone_number_id: "106540352242922",
              },
              contacts: [{ wa_id: from.replace("+", "") }],
              messages: [
                {
                  from: from.replace("+", ""),
                  id: msgId ?? `wamid.${Date.now()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: "image",
                  image: { id: imageId },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

function makeStatusPayload(): Record<string, unknown> {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "102290129340398",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: { phone_number_id: "106540352242922" },
              statuses: [{ id: "wamid.STATUS123", status: "delivered" }],
            },
          },
        ],
      },
    ],
  };
}

function post(body: Record<string, unknown>, sig?: string, msgId?: string): NextRequest {
  const url = "http://localhost:3000/api/webhooks/whatsapp";
  const req = new NextRequest(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(sig ? { "x-hub-signature-256": `sha256=${sig}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return req;
}

function getReq(verifyToken: string, challenge: string): NextRequest {
  const url = `http://localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=${challenge}`;
  return new NextRequest(url);
}

/* Known mock senders */
const OWNER = "+447700900100";
const OPERATOR = "+447700900200";
const SHEENA = "+16505551234";
const UNKNOWN = "+447700999999";

/* Signature helper — only works when WHATSAPP_APP_SECRET is set */
function computeSig(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

describe("WhatsApp webhook — GET", () => {
  it("returns challenge on valid verify_token", async () => {
    const res = await GET(getReq("checkinbliss-verify-2026", "abc123"));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("abc123");
  });

  it("returns 403 on bad verify_token", async () => {
    const res = await GET(getReq("wrong-token", "abc123"));
    expect(res.status).toBe(403);
  });

  it("returns 403 on missing challenge", async () => {
    const url = "http://localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=checkinbliss-verify-2026";
    const res = await GET(new NextRequest(url));
    expect(res.status).toBe(403);
  });
});

describe("WhatsApp webhook — POST", () => {
  beforeEach(() => {
    resetMockLedger();
    process.env.WHATSAPP_APP_SECRET = "";
  });

  afterEach(() => {
    process.env.WHATSAPP_APP_SECRET = "";
  });

  it("rejects unsigned body when secret is set", async () => {
    process.env.WHATSAPP_APP_SECRET = "test-secret";
    const body = makePayload(OWNER, "HELP");
    const bodyStr = JSON.stringify(body);
    /* wrong signature */
    const wrongSig = computeSig("different body", "test-secret");
    const res = await POST(post(body, wrongSig));
    expect(res.status).toBe(401);
  });

  it("accepts signed body when secret is set", async () => {
    process.env.WHATSAPP_APP_SECRET = "test-secret";
    const body = makePayload(OWNER, "HELP");
    const bodyStr = JSON.stringify(body);
    const correctSig = computeSig(bodyStr, "test-secret");
    const res = await POST(post(body, correctSig));
    expect(res.status).toBe(200);
  });

  it("handles status-only payloads gracefully", async () => {
    const res = await POST(post(makeStatusPayload()));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toHaveProperty("ignored", "no message");
  });

  it("deduplicates on message id", async () => {
    const msgId = "wamid.DEDUP001";
    const body = makePayload(OWNER, "HELP", msgId);
    const res1 = await POST(post(body));
    expect(res1.status).toBe(200);
    const res2 = await POST(post(body));
    const json2 = await res2.json();
    expect(json2).toHaveProperty("duplicate", true);
  });

  it("ignores unknown senders silently", async () => {
    const body = makePayload(UNKNOWN, "HELP");
    const res = await POST(post(body));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toHaveProperty("ignored", "unknown sender");
  });

  it("sends HELP on malformed input for owner", async () => {
    const body = makePayload(OWNER, "gibberish text");
    const res = await POST(post(body));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toHaveProperty("replied", "help");
  });

  it("sends HELP on malformed input for operator", async () => {
    const body = makePayload(OPERATOR, "random words");
    const res = await POST(post(body));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toHaveProperty("replied", "help");
  });
});

describe("WhatsApp webhook — Owner commands", () => {
  beforeEach(() => {
    resetMockLedger();
  });

  it("HELP returns command list", async () => {
    const body = makePayload(OWNER, "HELP");
    const res = await POST(post(body));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("ok", true);
  });

  it("BLOCK inserts availability block for owned property", async () => {
    const body = makePayload(OWNER, "BLOCK 1-5 Sept Lagoon View Loft");
    const res = await POST(post(body));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("ok", true);
  });

  it("BLOCK rejects unowned property", async () => {
    /* Owner OW1 does not own PR002 (Sunset Dove) — only PR001, PR003 */
    const body = makePayload(OWNER, "BLOCK 1-5 Sept Sunset Dove");
    const res = await POST(post(body));
    expect(res.status).toBe(200);
  });

  it("UNBLOCK removes availability block", async () => {
    /* First block, then unblock */
    const blockBody = makePayload(OWNER, "BLOCK 1-5 Sept Lagoon View Loft", "wamid.UB001");
    await POST(post(blockBody));
    const unblockBody = makePayload(OWNER, "UNBLOCK 1-5 Sept Lagoon View Loft", "wamid.UB002");
    const res = await POST(post(unblockBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("ok", true);
  });

  it("AVAILABILITY returns booked dates", async () => {
    const body = makePayload(OWNER, "AVAILABILITY Lagoon View Loft Sept");
    const res = await POST(post(body));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("ok", true);
  });

  it("AVAILABILITY rejects unknown property", async () => {
    const body = makePayload(OWNER, "AVAILABILITY Nonexistent Place Sept");
    const res = await POST(post(body));
    expect(res.status).toBe(200);
  });

  it("BOOKINGS lists upcoming bookings for owner", async () => {
    const body = makePayload(OWNER, "BOOKINGS");
    const res = await POST(post(body));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("ok", true);
  });

  it("BLOCK works for Sheena's owned property", async () => {
    /* OW2 (Sheena) owns PR002, PR005 */
    const body = makePayload(SHEENA, "BLOCK 10-15 Sept Sunset Dove");
    const res = await POST(post(body));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("ok", true);
  });

  it("BLOCK rejects property Sheena does not own", async () => {
    /* OW2 does not own PR001 (Lagoon View Loft) */
    const body = makePayload(SHEENA, "BLOCK 1-5 Sept Lagoon View Loft");
    const res = await POST(post(body));
    expect(res.status).toBe(200);
  });
});

describe("WhatsApp webhook — Operator commands", () => {
  beforeEach(() => {
    resetMockLedger();
  });

  it("YES confirms availability", async () => {
    const body = makePayload(OPERATOR, "YES");
    const res = await POST(post(body));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("ok", true);
  });

  it("REASSIGN delegates inspection", async () => {
    const body = makePayload(OPERATOR, "REASSIGN Chidi");
    const res = await POST(post(body));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("ok", true);
  });

  it("CLEAN releases deposit hold", async () => {
    const body = makePayload(OPERATOR, "CLEAN");
    const res = await POST(post(body));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("ok", true);
  });

  it("DAMAGE opens claim and expects photos", async () => {
    const body = makePayload(OPERATOR, "DAMAGE");
    const res = await POST(post(body));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("ok", true);
  });

  it("DAMAGE photo flow receives images", async () => {
    /* Start DAMAGE */
    await POST(post(makePayload(OPERATOR, "DAMAGE", "wamid.DP001")));
    /* Send an image */
    const imgBody = makeImagePayload(OPERATOR, "img001", "wamid.DP002");
    const res = await POST(post(imgBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("ok", true);
  });

  it("DAMAGE DONE finalizes claim", async () => {
    /* Start DAMAGE */
    await POST(post(makePayload(OPERATOR, "DAMAGE", "wamid.DD001")));
    /* Send DONE */
    const res = await POST(post(makePayload(OPERATOR, "DONE", "wamid.DD002")));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("ok", true);
  });

  it("NOSHOW escalates to admin", async () => {
    const body = makePayload(OPERATOR, "NOSHOW");
    const res = await POST(post(body));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("ok", true);
  });

  it("GUESTPRESENT escalates to admin", async () => {
    const body = makePayload(OPERATOR, "GUESTPRESENT");
    const res = await POST(post(body));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("ok", true);
  });

  it("DAMAGE without active DONE flow warns", async () => {
    /* No active damage flow */
    const res = await POST(post(makePayload(OPERATOR, "DONE")));
    expect(res.status).toBe(200);
  });

  it("image without active DAMAGE flow warns", async () => {
    /* No active damage flow */
    const res = await POST(post(makeImagePayload(OPERATOR, "img002")));
    expect(res.status).toBe(200);
  });
});
