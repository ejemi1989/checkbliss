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
  | { kind: "log_dispute"; disputeId: string; chargeId: string | null }
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
      const purpose = event.data.object.metadata?.purpose;
      const actions: StripeRouteAction[] = [];
      if (intentId) {
        actions.push({
          kind: "update_booking_group_charge",
          intentId,
          chargeStatus: "failed",
        });
      }
      if (purpose === "charge") {
        actions.push({ kind: "noop" });
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

    default:
      return [{ kind: "ignore" }];
  }
}
