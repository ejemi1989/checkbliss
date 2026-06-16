export const airwallexConfigured = !!(process.env.AIRWALLEX_CLIENT_ID && process.env.AIRWALLEX_API_KEY);

export async function createBookingCharge(amountMinor: number, requestId: string): Promise<{ intentId: string; status: string }> {
  if (!airwallexConfigured) {
    return { intentId: `mock-charge-${requestId}`, status: "succeeded" };
  }
  const env = process.env.AIRWALLEX_ENV || "demo";
  const baseUrl = env === "production"
    ? "https://api.airwallex.com/v1"
    : "https://api-demo.airwallex.com/v1";
  const token = await getAccessToken();
  const res = await fetch(`${baseUrl}/payment_intents`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      amount: amountMinor,
      currency: "GBP",
      request_id: requestId,
      capture_method: "automatic",
    }),
  });
  if (!res.ok) throw new Error(`Airwallex charge failed: ${res.status}`);
  const data = await res.json();
  return { intentId: data.id, status: data.status };
}

export async function createDepositHold(amountMinor: number, requestId: string): Promise<{ intentId: string; status: string }> {
  if (!airwallexConfigured) {
    return { intentId: `mock-hold-${requestId}`, status: "requires_capture" };
  }
  const env = process.env.AIRWALLEX_ENV || "demo";
  const baseUrl = env === "production"
    ? "https://api.airwallex.com/v1"
    : "https://api-demo.airwallex.com/v1";
  const token = await getAccessToken();
  const res = await fetch(`${baseUrl}/payment_intents`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      amount: amountMinor,
      currency: "GBP",
      request_id: requestId,
      capture_method: "manual",
    }),
  });
  if (!res.ok) throw new Error(`Airwallex deposit hold failed: ${res.status}`);
  const data = await res.json();
  return { intentId: data.id, status: data.status };
}

export async function releaseHold(intentId: string): Promise<void> {
  if (!airwallexConfigured || intentId.startsWith("mock-")) return;
  const env = process.env.AIRWALLEX_ENV || "demo";
  const baseUrl = env === "production"
    ? "https://api.airwallex.com/v1"
    : "https://api-demo.airwallex.com/v1";
  const token = await getAccessToken();
  await fetch(`${baseUrl}/payment_intents/${intentId}/cancel`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
}

export async function captureFromHold(intentId: string, amountMinor: number): Promise<void> {
  if (!airwallexConfigured || intentId.startsWith("mock-")) return;
  const env = process.env.AIRWALLEX_ENV || "demo";
  const baseUrl = env === "production"
    ? "https://api.airwallex.com/v1"
    : "https://api-demo.airwallex.com/v1";
  const token = await getAccessToken();
  await fetch(`${baseUrl}/payment_intents/${intentId}/capture`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ amount: amountMinor }),
  });
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.AIRWALLEX_CLIENT_ID!;
  const apiKey = process.env.AIRWALLEX_API_KEY!;
  const env = process.env.AIRWALLEX_ENV || "demo";
  const baseUrl = env === "production"
    ? "https://api.airwallex.com/v1"
    : "https://api-demo.airwallex.com/v1";
  const res = await fetch(`${baseUrl}/authentication/login`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "x-client-id": clientId },
  });
  if (!res.ok) throw new Error("Airwallex auth failed");
  const data = await res.json();
  return data.token;
}
