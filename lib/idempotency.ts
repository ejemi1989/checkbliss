/**
 * Idempotency layer — prevents duplicate processing of webhooks and cron jobs.
 * In-memory ledger for mock mode; `processed_events` table for production.
 */

interface ProcessedEvent {
  source: string;
  event_id: string;
  processed_at: string;
}

const mockLedger: ProcessedEvent[] = [];

export function wasProcessed(source: string, eventId: string): boolean {
  return mockLedger.some((e) => e.source === source && e.event_id === eventId);
}

export function markProcessed(source: string, eventId: string): void {
  if (!wasProcessed(source, eventId)) {
    mockLedger.push({
      source,
      event_id: eventId,
      processed_at: new Date().toISOString(),
    });
  }
}

export async function checkAndProcess(
  source: string,
  eventId: string,
): Promise<"skip" | "process"> {
  if (wasProcessed(source, eventId)) {
    console.log(`[idempotency] Duplicate — ${source}/${eventId}, skipping`);
    return "skip";
  }
  markProcessed(source, eventId);
  return "process";
}

export function resetMockLedger(): void {
  mockLedger.length = 0;
}
