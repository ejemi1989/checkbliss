-- 0016_rename_raenest_to_fincra.sql
-- Replace RaeNest (deferred partner) with Fincra as the NGN disbursement
-- provider for owner payouts. Column renames preserve data — no backfill
-- needed because no prod rows reference the old names.
--
-- Touches:
--   owner_payouts           — raenest_reference → fincra_reference,
--                             raenest_idempotency_key → fincra_idempotency_key
--   owner_payout_details    — raenest_beneficiary_id → fincra_beneficiary_id
--   booking_groups          — comment refresh on owner_payout_reference
--   payout_alerts           — comment refresh on alert kind enum

/* ------------------------------------------------------------------ */
/*  1. owner_payouts — rename reference columns                        */
/* ------------------------------------------------------------------ */

alter table owner_payouts
  rename column raenest_reference to fincra_reference;

alter table owner_payouts
  rename column raenest_idempotency_key to fincra_idempotency_key;

comment on column owner_payouts.fincra_reference
  is 'Fincra transaction reference for the owner payout';

comment on column owner_payouts.fincra_idempotency_key
  is 'Idempotency key for Fincra payout creation (fincra-{groupId}-{payoutId})';

/* ------------------------------------------------------------------ */
/*  2. owner_payout_details — rename beneficiary column                */
/* ------------------------------------------------------------------ */

alter table owner_payout_details
  rename column raenest_beneficiary_id to fincra_beneficiary_id;

comment on table owner_payout_details
  is 'Owner bank details for NGN disbursement via Fincra.';

comment on column owner_payout_details.fincra_beneficiary_id
  is 'Fincra beneficiary id registered for this owner';

/* ------------------------------------------------------------------ */
/*  3. booking_groups — refresh comments                               */
/* ------------------------------------------------------------------ */

comment on column booking_groups.owner_payout_reference
  is 'Fincra transaction reference for the owner payout';

comment on column booking_groups.owner_payout_requested_at
  is 'Timestamp when platform instructed Fincra to disburse';

/* ------------------------------------------------------------------ */
/*  4. payout_alerts — refresh comment for new alert kinds             */
/* ------------------------------------------------------------------ */

comment on column payout_alerts.kind
  is 'split_failed | fincra_unavailable | fincra_failed | bank_rejected | fx_out_of_range | duplicate_payout | payout_failed';

comment on table payout_alerts
  is 'Operational alerts for Stripe split failures, Fincra failures, bank rejections, FX anomalies.';
