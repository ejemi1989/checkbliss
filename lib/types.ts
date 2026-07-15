export type Role = "owner" | "operator" | "admin";

export type PropertyStatus = "draft" | "pending_review" | "approved" | "suspended";
export type ReservationStatus = "pending_payment" | "confirmed" | "completed" | "cancelled";
export type DepositStatus = "held" | "released" | "partially_captured" | "fully_captured" | "expired";
export type ClaimDecision = "pending" | "approved" | "adjusted" | "rejected";
export type DisputeStatus = "none" | "open" | "accepted" | "resolved";
export type OperatorStatus = "active" | "onboarding" | "suspended";

export interface Property {
  id: string;
  slug: string;
  name: string;
  city: string;
  neighbourhood: string;
  owner_id: string;
  owner_name: string;
  status: PropertyStatus;
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  nightly_price_minor: number;
  currency: string;
  extended_checkout_offered: boolean;
  extended_checkout_price_minor: number;
  bookings_count: number;
  revenue_minor: number;
  image_url: string;
}

export interface Reservation {
  id: string;
  booking_group_id: string;
  property_id: string;
  property_name: string;
  unit_name: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  guest_count: number;
  check_in: string;
  check_out: string;
  confirmed_checkout_time: string | null;
  late_checkout_fee_minor: number | null;
  total_minor: number;
  deposit_hold_minor: number;
  status: ReservationStatus;
  nights: number;
  payment_intent_id: string | null;
  created_at: string;
}

export interface BookingGroup {
  id: string;
  charge_intent_id: string | null;
  charge_status: string | null;
  currency: string;
  charge_total_minor: number;
  deposit_hold_total_minor: number;
  status: string;
  created_at: string;
}

export interface DepositHold {
  id: string;
  reservation_id: string;
  intent_id: string;
  amount_minor: number;
  status: DepositStatus;
  captured_amount_minor: number | null;
  expires_at: string;
  created_at: string;
}

export interface DamageClaim {
  id: string;
  reservation_id: string;
  property_name: string;
  property_id: string;
  guest_name: string;
  guest_email: string;
  booking_ref: string;
  stay_dates: string;
  description: string;
  estimated_cost_minor: number;
  operator_notes: string;
  photo_count: number;
  admin_decision: ClaimDecision;
  adjusted_amount_minor: number | null;
  dispute_status: DisputeStatus;
  submitted_at: string;
  decided_at: string | null;
  decided_by: string | null;
}

export interface Operator {
  id: string;
  name: string;
  email: string;
  city: string;
  assigned_cities: string[];
  properties_count: number;
  verified_count: number;
  status: OperatorStatus;
  quality_score: number;
  inspections_done: number;
  created_at: string;
}

export interface OwnerPayout {
  id: string;
  period: string;
  amount_minor: number;
  paid_at: string;
  status: string;
  units: string;
}

export interface OwnerBookingView {
  id: string;
  unit: string;
  guest: string;
  check_in: string;
  check_out: string;
  status: string;
  amount_minor: number;
  nights: number;
  guest_count: number;
}

export interface CurationItem {
  id: string;
  name: string;
  city: string;
  submitted_at: string;
  type: "new" | "resubmitted";
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  price_minor: number;
  status: "pending" | "approved" | "rejected";
}

export interface PipelineItem {
  id: string;
  name: string;
  status: PropertyStatus;
  updated_at: string;
}

export interface Inspection {
  id: string;
  property_id: string;
  property_name: string;
  unit: string;
  guest_name: string;
  checkout_date: string;
  checkout_time: string;
  status: "pending" | "in_progress" | "completed" | "escalated";
  confirmed_checkout_time: string | null;
}

export interface VerificationRecord {
  id: string;
  property_name: string;
  date: string;
  status: string;
  photos: number;
  notes: string;
}

export interface FinanceRecord {
  id: string;
  type: "payment" | "payout" | "deposit_hold";
  guest_or_owner: string;
  property: string;
  amount_minor: number;
  date: string;
  status: string;
  ref: string;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  type: "Guest" | "Owner";
  bookings_or_properties: number;
  status: string;
}

export interface AuditEntry {
  action: string;
  target: string;
  by: string;
  date: string;
  detail: string;
}

export interface CalendarBooking {
  dates: string[];
  unit: string;
  guest: string;
}

export interface AdminBookingView {
  id: string;
  property_name: string;
  unit: string;
  guest: string;
  guest_email: string;
  property_id: string;
  check_in: string;
  check_out: string;
  status: string;
  amount_minor: number;
  nights: number;
  guest_count: number;
}

export interface AdminStat {
  label: string;
  value: string;
  sub: string;
  subColor?: string;
  accent: boolean;
}

export interface OperatorStat {
  label: string;
  value: string;
  sub: string;
  subColor: string;
  accent: boolean;
}

export interface OwnerStat {
  name: string;
  unit: string;
  meta: string;
  monthly_label: string;
  bookings_label: string;
  occ_label: string;
  active: boolean;
}

export type ActionResponse<T = void> =
  | { ok: true; data?: T }
  | { ok: false; code: string; message: string };
