import type { StatusPillProps } from "./status-pill";

/* Maps CRM audit action strings to the editorial StatusPill variant.
   Replaces the hardcoded `bg-blue-100 text-blue-700` etc. class strings
   that were scattered across CRM sub-pages. */

export const CRM_ACTION_VARIANT: Record<string, StatusPillProps["variant"]> = {
  "whatsapp.in": "accent",
  "whatsapp.out": "success",
  "calendar.block": "neutral",
  "inspection.clean": "success",
  "inspection.damage": "warning",
  "claim.decision": "warning",
  "dispute.raised": "danger",
  "stripe.event": "neutral",
};

/* Thread status (inbox) */
export function threadVariant(s: string): StatusPillProps["variant"] {
  if (s === "resolved") return "success";
  if (s === "escalated") return "danger";
  return "accent";
}

/* CRM claim admin_decision */
export function crmClaimVariant(s: string): StatusPillProps["variant"] {
  if (s === "approved") return "success";
  if (s === "rejected") return "danger";
  if (s === "pending") return "warning";
  return "neutral";
}

/* CRM contact role */
export function roleVariant(role: string): StatusPillProps["variant"] {
  if (role === "owner") return "accent";
  if (role === "operator") return "neutral";
  return "neutral";
}
