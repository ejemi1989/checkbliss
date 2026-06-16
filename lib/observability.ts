/**
 * Observability foundation — structured logging and cron heartbeats.
 * In production, ship to external observability (Sentry, Datadog, etc.).
 * Mock mode logs to console with [context] prefix.
 */

type LogLevel = "info" | "warn" | "error";

const heartbeatStore: Record<string, { lastRun: string; status: "ok" | "error"; message?: string }> = {};

export function log(context: string, level: LogLevel, message: string, data?: Record<string, unknown>): void {
  const prefix = `[${context}]`;
  const extra = data ? ` ${JSON.stringify(data)}` : "";
  if (level === "error") console.error(`${prefix} ${message}${extra}`);
  else if (level === "warn") console.warn(`${prefix} ${message}${extra}`);
  else console.log(`${prefix} ${message}${extra}`);
}

export function heartbeat(cronName: string): void {
  heartbeatStore[cronName] = {
    lastRun: new Date().toISOString(),
    status: "ok",
  };
  log("heartbeat", "info", `Cron ${cronName} ran successfully`);
}

export function heartbeatError(cronName: string, error: string): void {
  heartbeatStore[cronName] = {
    lastRun: new Date().toISOString(),
    status: "error",
    message: error,
  };
  log("heartbeat", "error", `Cron ${cronName} failed: ${error}`);
}

export function getHeartbeats(): Record<string, { lastRun: string; status: "ok" | "error"; message?: string }> {
  return { ...heartbeatStore };
}

export function checkStale(
  cronName: string,
  maxAgeMinutes: number,
): boolean {
  const hb = heartbeatStore[cronName];
  if (!hb) return true;
  const age = Date.now() - new Date(hb.lastRun).getTime();
  const stale = age > maxAgeMinutes * 60 * 1000;
  if (stale) log("heartbeat", "error", `Cron ${cronName} is stale — last run ${hb.lastRun} (${Math.round(age / 60000)} min ago)`);
  return stale;
}
