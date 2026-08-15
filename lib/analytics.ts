import "server-only";
import { log } from "@/lib/observability";

export interface PageViewInput {
  path: string;
  title?: string;
  sessionId?: string;
  clientId?: string;
}

function gaConfig() {
  return {
    id: process.env.GA_MEASUREMENT_ID ?? "",
    secret: process.env.GA_API_SECRET ?? "",
  };
}

export function analyticsConfigured(): boolean {
  const { id, secret } = gaConfig();
  return Boolean(id && secret);
}

export async function sendPageView({ path, title, sessionId, clientId }: PageViewInput): Promise<void> {
  const { id, secret } = gaConfig();
  if (!id || !secret) return;

  const client_id = clientId || `forare${Date.now()}${Math.floor(Math.random() * 1000)}`;
  try {
    const res = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(id)}&api_secret=${encodeURIComponent(secret)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id,
          events: [
            {
              name: "page_view",
              params: {
                page_location: path,
                page_title: title,
                session_id: sessionId,
                engagement_time_msec: 100,
              },
            },
          ],
        }),
      },
    );
    if (!res.ok) {
      log("analytics", "warn", `GA4 page_view rejected: ${res.status}`);
    }
  } catch (err) {
    log("analytics", "warn", `GA4 page_view failed: ${err instanceof Error ? err.message : "unknown"}`);
  }
}
