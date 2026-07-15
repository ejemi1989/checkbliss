-- 0007_rename_hold_column.sql
-- Rename airwallex_authorisation_id to payment_intent_id as the payment
-- provider switched from Airwallex to Stripe. The column now stores a
-- Stripe PaymentIntent id (e.g. pi_3O...). Provider-agnostic naming
-- future-proofs the column if we ever switch again.

alter table deposit_holds
  rename column airwallex_authorisation_id to payment_intent_id;
