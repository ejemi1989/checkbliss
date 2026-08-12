export type StripeRouteAction =
  | { kind: "noop" }
  | {
      kind: "update_booking_group_charge";
      intentId: string;
      chargeStatus: "succeeded" | "failed";
    }
  | {
      kind: "update_deposit_hold_status";
      intentId: string;
      holdStatus: "held" | "released";
      releasedAt?: string;
    }
  | { kind: "cancel_booking_group"; groupId: string }
  | { kind: "log_dispute"; disputeId: string; chargeId: string | null }
  | { kind: "complete_one_time_payment"; sessionId: string }
  | { kind: "record_refund"; chargeId: string; refundAmount: number; bookingGroupId: string }
  | { kind: "ignore" };

export interface StripeEventLike {
  type: string;
  id: string;
  data: { object: { id?: string | null; metadata?: Record<string, string> | null } };
}

export function routeStripeEvent(event: StripeEventLike): StripeRouteAction[] {
  const intentId = event.data.object.id ?? null;

  switch (event.type) {
    case "payment_intent.succeeded": {
      const purpose = event.data.object.metadata?.purpose;
      const actions: StripeRouteAction[] = [];
      if (intentId) {
        actions.push({
          kind: "update_booking_group_charge",
          intentId,
          chargeStatus: "succeeded",
        });
      }
      if (purpose === "hold" && intentId) {
        actions.push({
          kind: "update_deposit_hold_status",
          intentId,
          holdStatus: "held",
        });
      }
      return actions;
    }

    case "payment_intent.payment_failed": {
      const groupId = event.data.object.metadata?.booking_group_id;
      const actions: StripeRouteAction[] = [];
      if (intentId) {
        actions.push({
          kind: "update_booking_group_charge",
          intentId,
          chargeStatus: "failed",
        });
      }
      if (groupId) {
        actions.push({ kind: "cancel_booking_group", groupId });
      }
      return actions;
    }

    case "payment_intent.canceled": {
      if (!intentId) return [];
      return [
        {
          kind: "update_deposit_hold_status",
          intentId,
          holdStatus: "released",
          releasedAt: new Date().toISOString(),
        },
      ];
    }

    case "payment_intent.amount_capturable_updated": {
      if (!intentId) return [];
      return [
        {
          kind: "update_deposit_hold_status",
          intentId,
          holdStatus: "held",
        },
      ];
    }

    case "charge.dispute.created": {
      const obj = event.data.object as unknown as { id?: string; charge?: string };
      return [
        {
          kind: "log_dispute",
          disputeId: obj.id ?? event.id,
          chargeId: obj.charge ?? null,
        },
      ];
    }

    case "charge.refunded": {
      const obj = event.data.object as unknown as {
        id?: string;
        amount_refunded?: number;
        metadata?: Record<string, string> | null;
      };
      const groupId = obj.metadata?.booking_group_id ?? null;
      if (!groupId) return [{ kind: "ignore" }];
      return [
        {
          kind: "record_refund",
          chargeId: obj.id ?? "",
          refundAmount: obj.amount_refunded ?? 0,
          bookingGroupId: groupId,
        },
      ];
    }

    case "checkout.session.completed": {
      const sessionId = event.data.object.id ?? null;
      if (!sessionId) return [];
      return [{ kind: "complete_one_time_payment", sessionId }];
    }

    default:
      return [{ kind: "ignore" }];
  }
}
