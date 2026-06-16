/**
 * Outbox pattern — decouples booking/payment confirmation from side-effect delivery.
 * In mock mode, logs to console and returns immediately.
 * In production, writes to `outbox` table and delivers via cron/worker.
 */

interface OutboxMessage {
  id: string;
  type: "email" | "whatsapp" | "audit";
  recipient: string;
  subject?: string;
  body: string;
  status: "pending" | "sent" | "failed";
  created_at: string;
  attempts: number;
  max_attempts: number;
}

const mockOutbox: OutboxMessage[] = [];

export function enqueue(
  type: OutboxMessage["type"],
  recipient: string,
  body: string,
  subject?: string,
): void {
  const msg: OutboxMessage = {
    id: `out-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    recipient,
    subject,
    body,
    status: "pending",
    created_at: new Date().toISOString(),
    attempts: 0,
    max_attempts: 5,
  };
  mockOutbox.push(msg);
  console.log(`[outbox] Enqueued ${type} → ${recipient}: ${body.slice(0, 80)}${body.length > 80 ? "..." : ""}`);
}

export function deliveryAttempt(msgId: string, success: boolean): void {
  const msg = mockOutbox.find((m) => m.id === msgId);
  if (!msg) return;
  msg.attempts++;
  if (success) {
    msg.status = "sent";
    console.log(`[outbox] Delivered ${msg.type} → ${msg.recipient}`);
  } else {
    if (msg.attempts >= msg.max_attempts) {
      msg.status = "failed";
      console.error(`[outbox] DEAD-LETTER ${msg.type} → ${msg.recipient} after ${msg.attempts} attempts`);
    }
  }
}

export function getPendingOutbox(): OutboxMessage[] {
  return mockOutbox.filter((m) => m.status === "pending");
}

export function resetMockOutbox(): void {
  mockOutbox.length = 0;
}
