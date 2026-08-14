CHECKINBLISS – PAYMENT ARCHITECTURE DOCUMENT
Document Type: Payment Architecture
Prepared For: Oladimeji Suraju
Date: 12/08/2026
CHECKINBLISS - Payment Architecture Overview

1. OVERVIEW
CheckinBliss operates through a two-entity structure:
 UK Parent: Lyxio Curtis Ltd (trading as CheckinBliss) — receives platform
commission
 Nigerian Subsidiary: Lyxio Curtis Nigeria Ltd (trading as CheckinBliss Nigeria)
— receives owner share and disburses to Nigerian property owners
Payment flow uses Stripe Connect (UK) for collection, Raenest (or equivalent
partner) for NGN disbursement.

Step 1: Guest payment via Stripe
Guest completes booking on CheckinBliss website. Payment processed through
Stripe Connect using guest&#39;s international card (Visa, Mastercard, Amex from non-
Nigerian issuing bank — BIN filtering rejects Nigerian-issued cards).
Guest sees single charge for total booking amount in their currency (GBP, USD,
EUR, or CAD).
Example transaction: £600 booking charged in full to guest&#39;s UK-issued Visa.

Step 2: Stripe Connect splits the transaction
At the moment of successful payment, Stripe Connect executes a split with two
destinations defined in the charge metadata:
Destination A: Platform Commission (12%)
 Amount: 12% of total booking value
 Routes to: Lyxio Curtis Ltd Stripe Balance
 Example: £72 (12% of £600)
Destination B: Owner Share (88%)

 Amount: 88% of total booking value
 Routes to: Nigerian subsidiary&#39;s collection account at Raenest (or equivalent
partner)
 Example: £528 (88% of £600)

Step 3: Commission settles to UK bank
The £72 in Lyxio Curtis Ltd&#39;s Stripe Balance settles to the RBS business account
(sort code and account number already configured in Stripe) on the configured
manual payout schedule.
This is CheckinBliss&#39;s revenue. Fully compliant with UK regulations as this
represents platform commission, not client funds.

Step 4: Owner share arrives at Raenest
The £528 arrives in Lyxio Curtis Nigeria Ltd&#39;s Raenest account (or equivalent
partner). This is a Nigerian-incorporated subsidiary receiving payment under
Nigerian regulatory framework (CBN).
Funds held under Raenest&#39;s regulated structure until platform instructs payout.

Step 5: Platform instructs owner payout via API
CheckinBliss platform sends API call to Raenest instructing:
 Beneficiary: specific property owner (registered as Raenest beneficiary during
onboarding)
 Amount: NGN equivalent of £528 minus platform-negotiated FX and payout
fees
 Timing: as per configured payout schedule (see below)
Step 6: Raenest converts and pays owner
Raenest converts GBP to NGN at prevailing rate and pays the NGN equivalent to the
property owner&#39;s Nigerian bank account (GTBank, Access Bank, Zenith, UBA, etc.).
Property owner receives NGN in their standard Nigerian business account.
Payout Timing Rules
Owner payouts are NOT automatic on booking. They release after specific
conditions:

Standard payout release triggers:
 Guest completed check-in successfully
 Guest completed check-out
 Inspection completed by city operator with CLEAN or damage-resolved status
 No active damage claim outstanding
Payout timing: 3-5 business days after all conditions met.
Reason: Protects platform from paying owner before verifying successful stay.
Protects guests from paying before receiving service. Protects owners from disputes.

Refund Handling
Refunds work in reverse of the split:
Full refund scenarios:
 Platform reverses charge on guest&#39;s original card
 Commission (12%) returned to platform
 Owner share (88%) reversed from Raenest account
 If owner has already been paid, refund is recovered from owner (contractually
addressed in operator agreement)
Partial refund scenarios (damage claims):
 Guest receives partial refund based on damage claim resolution
 Deductions applied at platform level, not owner level
 Owner receives their share minus platform-approved damage deductions
Currency Handling
Guest-facing:
 Prices displayed in guest&#39;s local currency (GBP, USD, EUR, CAD)
 Payment collected in local currency only
 No NGN payment options for guests
Platform-facing:
 Stripe holds funds in original guest currency
 Commission routed to Stripe Balance in guest currency, settles to RBS in
GBP

 Owner share routed to Raenest in guest currency (or converted based on
Raenest capabilities)
Owner-facing:
 Owner receives NGN only
 FX conversion happens at Raenest layer
 Owner sees GBP equivalent for records (informational)

Data Model Requirements
Platform database needs to track:
Booking table additions:
 total_amount (guest-facing amount in guest currency)
 commission_amount (12% platform share)
 owner_share_amount (88% owner share)
 guest_currency
 stripe_charge_id
 platform_payout_status (pending/settled/failed)
 owner_payout_status (pending/released/paid/failed)
 owner_payout_reference (Raenest transaction reference)
 owner_payout_ngn_amount (final NGN amount paid)
 owner_payout_fx_rate (rate at conversion)
 owner_payout_date

Property Owner table additions:
 raenest_beneficiary_id (registered beneficiary reference at Raenest)
 nigerian_bank_name
 nigerian_bank_account_number
 nigerian_bank_account_name
 tax_identification_number (for Nigerian tax compliance)

Reconciliation Requirements
Platform admin dashboard must provide:
 Daily reconciliation view showing all transactions across Stripe and Raenest
 Booking-to-payout traceability (from initial charge to final owner payment)
 Failed transaction alerts (Stripe charge failures, Raenest payout failures, split
routing failures)
 Currency conversion tracking (rates applied, dates, references)
 Owner payout history per property owner
 Platform commission summary (daily, weekly, monthly)

Error Handling
Critical error scenarios that need handling:
1. Stripe split fails: Retry with exponential backoff, alert admin, ensure funds don&#39;t sit
in ambiguous state.
2. Raenest API unavailable: Queue payout for retry, alert admin after 15-minute
timeout, provide manual payout instruction fallback.
3. Owner bank account rejected: Alert admin immediately, hold funds in Raenest,
contact owner via operator to update bank details.
4. FX conversion outside expected range: Alert admin for review before proceeding.
5. Duplicate payout attempts: Idempotency keys required on all Raenest API calls.

Testing Requirements
Before launch:
1. Test successful payment split with real UK-issued card
2. Test refund flow (full and partial)
3. Test payout release triggered by inspection completion
4. Test failed payout retry logic
5. Test dispute/damage claim payout hold
6. Test currency conversion accuracy across multiple currencies
7. Test edge cases: partial refunds, split refunds, cancellations at various stages

8. Test operator dashboard payout visibility per city
9. Test admin reconciliation dashboard accuracy
10. Confirm all transactions properly logged for audit trail
Please confirm:
1. You can build to this specification
2. Estimated implementation time (in days)
3. Any technical concerns or questions
4. Any information needed from Stripe or Raenest to proceed
Best,
Curtis

CONFIDENTIAL – CheckinBliss
This document is shared for evaluation purposes only and should not be
distributed or reused without permission.