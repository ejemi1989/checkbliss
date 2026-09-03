-- 0017_owner_payout_details_bank_code.sql
-- Add bank_code column to owner_payout_details so the payout cron can pass
-- the Nigerian bank routing code to Fincra's payout API. The bank's friendly
-- name already lives in nigerian_bank_name; bank_code is the Fincra-side
-- routing identifier (e.g. "058" for GTBank, "044" for Access).

alter table owner_payout_details
  add column if not exists bank_code text;

comment on column owner_payout_details.bank_code
  is 'Fincra-side bank routing code (e.g. 058 GTBank, 044 Access, 057 Zenith)';
