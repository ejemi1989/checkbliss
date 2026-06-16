import type {
  OwnerBookingView,
  OwnerPayout,
  CalendarBooking,
  CurationItem,
  PipelineItem,
  Inspection,
  VerificationRecord,
  DamageClaim,
  Operator,
  AdminStat,
  OperatorStat,
  Property,
  FinanceRecord,
  UserRecord,
  AuditEntry,
} from "./types";

const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, "0");

export function getOwnerBookings(): OwnerBookingView[] {
  return [
    { id: "B001", unit: "Unit 1 — The Palms Maisonette", guest: "Chidi Okafor", check_in: `${yyyy}-${mm}-18`, check_out: `${yyyy}-${mm}-22`, status: "confirmed", amount_minor: 84000, nights: 4, guest_count: 3 },
    { id: "B002", unit: "Unit 2 — Sunset Dove", guest: "Folake Adeyemi", check_in: `${yyyy}-${mm}-20`, check_out: `${yyyy}-${mm}-24`, status: "confirmed", amount_minor: 64000, nights: 4, guest_count: 2 },
    { id: "B003", unit: "Unit 1 — The Palms Maisonette", guest: "Emeka Nwosu", check_in: `${yyyy}-${mm}-25`, check_out: `${yyyy}-${mm}-30`, status: "confirmed", amount_minor: 108000, nights: 5, guest_count: 4 },
    { id: "B004", unit: "Unit 2 — Sunset Dove", guest: "Zainab Bello", check_in: `${yyyy}-07-01`, check_out: `${yyyy}-07-04`, status: "confirmed", amount_minor: 48000, nights: 3, guest_count: 2 },
    { id: "B005", unit: "Unit 1 — The Palms Maisonette", guest: "Tunde Balogun", check_in: `${yyyy}-07-05`, check_out: `${yyyy}-07-08`, status: "pending", amount_minor: 72000, nights: 3, guest_count: 2 },
  ];
}

export function getOwnerPayouts(): OwnerPayout[] {
  return [
    { id: "P001", period: "June 2026", amount_minor: 300000, paid_at: `${yyyy}-07-05`, status: "paid", units: "All 2 units" },
    { id: "P002", period: "May 2026", amount_minor: 240000, paid_at: `${yyyy}-06-05`, status: "paid", units: "All 2 units" },
    { id: "P003", period: "April 2026", amount_minor: 288000, paid_at: `${yyyy}-05-05`, status: "paid", units: "All 2 units" },
    { id: "P004", period: "March 2026", amount_minor: 192000, paid_at: `${yyyy}-04-05`, status: "paid", units: "All 2 units" },
  ];
}

export function getCalendarBookings(): CalendarBooking[] {
  return [
    { dates: [`${yyyy}-${mm}-18`, `${yyyy}-${mm}-19`, `${yyyy}-${mm}-20`, `${yyyy}-${mm}-21`], unit: "Unit 1", guest: "Chidi Okafor" },
    { dates: [`${yyyy}-${mm}-20`, `${yyyy}-${mm}-21`, `${yyyy}-${mm}-22`, `${yyyy}-${mm}-23`], unit: "Unit 2", guest: "Folake Adeyemi" },
    { dates: [`${yyyy}-${mm}-25`, `${yyyy}-${mm}-26`, `${yyyy}-${mm}-27`, `${yyyy}-${mm}-28`, `${yyyy}-${mm}-29`], unit: "Unit 1", guest: "Emeka Nwosu" },
  ];
}

export function getCurationQueue(): CurationItem[] {
  return [
    { id: "P001", name: "Lekki Beach House", city: "Lagos", submitted_at: `${yyyy}-${mm}-12`, type: "new", bedrooms: 3, bathrooms: 2, max_guests: 6, price_minor: 85000, status: "pending" },
    { id: "P002", name: "Ikeja Smart Studio", city: "Lagos", submitted_at: `${yyyy}-${mm}-11`, type: "new", bedrooms: 1, bathrooms: 1, max_guests: 2, price_minor: 45000, status: "pending" },
    { id: "P003", name: "Victoria Island Penthouse", city: "Lagos", submitted_at: `${yyyy}-${mm}-10`, type: "resubmitted", bedrooms: 4, bathrooms: 3, max_guests: 8, price_minor: 150000, status: "pending" },
    { id: "P004", name: "Surulere Cozy Flat", city: "Lagos", submitted_at: `${yyyy}-${mm}-09`, type: "new", bedrooms: 2, bathrooms: 1, max_guests: 4, price_minor: 55000, status: "pending" },
  ];
}

export function getPipeline(): PipelineItem[] {
  return [
    { id: "P005", name: "Ajah Oceanview", status: "draft", updated_at: `${yyyy}-${mm}-14` },
    { id: "P006", name: "Yaba Tech Hub", status: "draft", updated_at: `${yyyy}-${mm}-13` },
    { id: "P007", name: "Magodo Gate House", status: "draft", updated_at: `${yyyy}-${mm}-12` },
    { id: "P001", name: "Lekki Beach House", status: "pending_review", updated_at: `${yyyy}-${mm}-12` },
    { id: "P002", name: "Ikeja Smart Studio", status: "pending_review", updated_at: `${yyyy}-${mm}-11` },
    { id: "P003", name: "VI Penthouse", status: "pending_review", updated_at: `${yyyy}-${mm}-10` },
    { id: "P004", name: "Surulere Cozy Flat", status: "pending_review", updated_at: `${yyyy}-${mm}-09` },
    { id: "P008", name: "Lekki Phase One Duplex", status: "approved", updated_at: `${yyyy}-${mm}-08` },
    { id: "P009", name: "GRA Executive Suite", status: "approved", updated_at: `${yyyy}-${mm}-07` },
    { id: "P010", name: "Ikoyi Garden Villa", status: "suspended", updated_at: `${yyyy}-${mm}-05` },
  ];
}

export function getInspections(): Inspection[] {
  return [
    { id: "I001", property_id: "PR001", property_name: "Unit 1 — The Palms Maisonette", unit: "Unit 1", guest_name: "Chidi Okafor", checkout_date: `${yyyy}-${mm}-22`, checkout_time: "11:00", status: "pending", confirmed_checkout_time: null },
    { id: "I002", property_id: "PR002", property_name: "Unit 2 — Sunset Dove", unit: "Unit 2", guest_name: "Folake Adeyemi", checkout_date: `${yyyy}-${mm}-24`, checkout_time: "10:00", status: "pending", confirmed_checkout_time: null },
    { id: "I003", property_id: "PR003", property_name: "Lekki Beach House", unit: "Show unit", guest_name: "Walkthrough", checkout_date: `${yyyy}-${mm}-15`, checkout_time: "14:00", status: "pending", confirmed_checkout_time: null },
  ];
}

export function getVerifications(): VerificationRecord[] {
  return [
    { id: "V001", property_name: "The Palms Maisonette", date: `${yyyy}-${mm}-01`, status: "complete", photos: 6, notes: "All amenities functional, minor touch-up needed on wall paint" },
    { id: "V002", property_name: "Sunset Dove", date: `${yyyy}-${mm}-01`, status: "complete", photos: 8, notes: "AC serviced, new linens stocked" },
    { id: "V003", property_name: "Lekki Beach House", date: `${yyyy}-05-28`, status: "complete", photos: 5, notes: "Pending final inspection before listing" },
    { id: "V004", property_name: "Ikeja Smart Studio", date: `${yyyy}-05-25`, status: "complete", photos: 4, notes: "WiFi upgraded to fiber" },
  ];
}

export function getAdminStats(): AdminStat[] {
  return [
    { label: "Total Properties", value: "28", sub: "+4 this month", accent: false },
    { label: "Active Bookings", value: "12", sub: "Across 8 properties", accent: false },
    { label: "Revenue (MTD)", value: "£24,000", sub: "↑ 18% vs May", subColor: "text-success", accent: false },
    { label: "Active Operators", value: "4", sub: "3 cities covered", accent: true },
  ];
}

export function getOperatorStats(): OperatorStat[] {
  return [
    { label: "Properties Verified", value: "47", sub: "↑ 12 this month", subColor: "text-success", accent: false },
    { label: "Quality Score", value: "92%", sub: "Above target (85%)", subColor: "text-ink-secondary", accent: false },
    { label: "Inspections Done", value: "28", sub: "3 pending today", subColor: "text-warning", accent: false },
    { label: "Supply Target", value: "18/25", sub: "Properties on platform", subColor: "text-ink-secondary", accent: true },
  ];
}

export function getAdminClaims(): DamageClaim[] {
  return [
    { id: "C001", reservation_id: "R001", property_name: "The Palms Maisonette · Unit 1", property_id: "PR001", guest_name: "Chidi Okafor", guest_email: "chidi.o@email.com", booking_ref: "PAY-2026-0618", stay_dates: `Jun 18–22`, description: "Broken glass table in living room. Photos attached.", estimated_cost_minor: 35000, operator_notes: "", photo_count: 3, admin_decision: "pending", adjusted_amount_minor: null, dispute_status: "none", submitted_at: `${yyyy}-${mm}-22`, decided_at: null, decided_by: null },
    { id: "C002", reservation_id: "R002", property_name: "Sunset Dove · Unit 2", property_id: "PR002", guest_name: "Folake Adeyemi", guest_email: "folake.a@email.com", booking_ref: "PAY-2026-0620", stay_dates: `Jun 20–24`, description: "Stained bedsheets — replacement needed.", estimated_cost_minor: 15000, operator_notes: "", photo_count: 2, admin_decision: "pending", adjusted_amount_minor: null, dispute_status: "none", submitted_at: `${yyyy}-${mm}-23`, decided_at: null, decided_by: null },
    { id: "C003", reservation_id: "R003", property_name: "Lekki Beach House", property_id: "PR003", guest_name: "Walkthrough", guest_email: "", booking_ref: "N/A", stay_dates: "Pre-listing", description: "Minor wall scuff marks noted during pre-listing inspection.", estimated_cost_minor: 0, operator_notes: "", photo_count: 1, admin_decision: "pending", adjusted_amount_minor: null, dispute_status: "none", submitted_at: `${yyyy}-${mm}-20`, decided_at: null, decided_by: null },
  ];
}

export function getAdminOperators(): Operator[] {
  return [
    { id: "OP1", name: "Tunde Ogunlade", email: "tunde.o@checkinbliss.com", city: "Lagos", assigned_cities: ["Lagos"], properties_count: 18, verified_count: 47, status: "active", quality_score: 92, inspections_done: 28, created_at: `${yyyy}-01-15` },
    { id: "OP2", name: "Funke Adeyemi", email: "funke.a@checkinbliss.com", city: "Abuja", assigned_cities: ["Abuja"], properties_count: 7, verified_count: 23, status: "active", quality_score: 88, inspections_done: 15, created_at: `${yyyy}-02-10` },
    { id: "OP3", name: "Chibueze Nnamdi", email: "chibueze.n@checkinbliss.com", city: "Port Harcourt", assigned_cities: ["Port Harcourt"], properties_count: 3, verified_count: 8, status: "active", quality_score: 90, inspections_done: 8, created_at: `${yyyy}-03-01` },
    { id: "OP4", name: "Yetunde Bakare", email: "yetunde.b@checkinbliss.com", city: "Lagos", assigned_cities: ["Lagos"], properties_count: 0, verified_count: 0, status: "onboarding", quality_score: 0, inspections_done: 0, created_at: `${yyyy}-06-05` },
  ];
}

export function getAdminFinance(): FinanceRecord[] {
  return [
    { id: "F001", type: "payment", guest_or_owner: "Chidi Okafor", property: "The Palms Maisonette", amount_minor: 84000, date: `${yyyy}-${mm}-18`, status: "settled", ref: "PAY-2026-0618" },
    { id: "F002", type: "payment", guest_or_owner: "Folake Adeyemi", property: "Sunset Dove", amount_minor: 64000, date: `${yyyy}-${mm}-20`, status: "settled", ref: "PAY-2026-0620" },
    { id: "F003", type: "payout", guest_or_owner: "Adaora Mensah", property: "All units", amount_minor: 300000, date: `${yyyy}-${mm}-05`, status: "paid", ref: "PO-2026-0605" },
    { id: "F004", type: "deposit_hold", guest_or_owner: "Chidi Okafor", property: "The Palms Maisonette", amount_minor: 50000, date: `${yyyy}-${mm}-18`, status: "held", ref: "DEPT-2026-0618" },
    { id: "F005", type: "deposit_hold", guest_or_owner: "Folake Adeyemi", property: "Sunset Dove", amount_minor: 50000, date: `${yyyy}-${mm}-20`, status: "held", ref: "DEPT-2026-0620" },
    { id: "F006", type: "payment", guest_or_owner: "Emeka Nwosu", property: "The Palms Maisonette", amount_minor: 108000, date: `${yyyy}-${mm}-25`, status: "processing", ref: "PAY-2026-0625" },
  ];
}

export function getAdminProperties(): Property[] {
  return [
    { id: "P001", slug: "palms-maisonette-1", name: "The Palms Maisonette · Unit 1", city: "Lagos", neighbourhood: "Victoria Island", owner_id: "OW1", owner_name: "Adaora Mensah", status: "approved", bedrooms: 2, bathrooms: 2, max_guests: 4, nightly_price_minor: 21000, currency: "GBP", extended_checkout_offered: true, extended_checkout_price_minor: 8400, bookings_count: 5, revenue_minor: 420000, image_url: "" },
    { id: "P002", slug: "sunset-dove-2", name: "Sunset Dove · Unit 2", city: "Lagos", neighbourhood: "Ikoyi", owner_id: "OW1", owner_name: "Adaora Mensah", status: "approved", bedrooms: 1, bathrooms: 1, max_guests: 2, nightly_price_minor: 16000, currency: "GBP", extended_checkout_offered: true, extended_checkout_price_minor: 6400, bookings_count: 3, revenue_minor: 240000, image_url: "" },
    { id: "P003", slug: "lekki-beach-house", name: "Lekki Beach House", city: "Lagos", neighbourhood: "Lekki", owner_id: "OW2", owner_name: "Kola Ogun", status: "pending_review", bedrooms: 3, bathrooms: 2, max_guests: 6, nightly_price_minor: 85000, currency: "GBP", extended_checkout_offered: false, extended_checkout_price_minor: 0, bookings_count: 0, revenue_minor: 0, image_url: "" },
    { id: "P004", slug: "ikeja-smart-studio", name: "Ikeja Smart Studio", city: "Lagos", neighbourhood: "Ikeja", owner_id: "OW3", owner_name: "Bisi Fashola", status: "pending_review", bedrooms: 1, bathrooms: 1, max_guests: 2, nightly_price_minor: 45000, currency: "GBP", extended_checkout_offered: false, extended_checkout_price_minor: 0, bookings_count: 0, revenue_minor: 0, image_url: "" },
    { id: "P005", slug: "gra-executive-suite", name: "GRA Executive Suite", city: "Abuja", neighbourhood: "GRA", owner_id: "OW4", owner_name: "Ngozi Okonkwo", status: "approved", bedrooms: 2, bathrooms: 2, max_guests: 4, nightly_price_minor: 55000, currency: "GBP", extended_checkout_offered: true, extended_checkout_price_minor: 22000, bookings_count: 2, revenue_minor: 220000, image_url: "" },
    { id: "P006", slug: "ikoyi-garden-villa", name: "Ikoyi Garden Villa", city: "Lagos", neighbourhood: "Ikoyi", owner_id: "OW5", owner_name: "Tunde Savage", status: "suspended", bedrooms: 4, bathrooms: 3, max_guests: 8, nightly_price_minor: 90000, currency: "GBP", extended_checkout_offered: false, extended_checkout_price_minor: 0, bookings_count: 1, revenue_minor: 180000, image_url: "" },
    { id: "P007", slug: "transcorp-hilton-apartment", name: "Transcorp Hilton Apartment", city: "Abuja", neighbourhood: "Central", owner_id: "OW6", owner_name: "Ibrahim Musa", status: "approved", bedrooms: 2, bathrooms: 2, max_guests: 4, nightly_price_minor: 47500, currency: "GBP", extended_checkout_offered: false, extended_checkout_price_minor: 0, bookings_count: 1, revenue_minor: 95000, image_url: "" },
    { id: "P008", slug: "ph-waterfront-cottage", name: "PH Waterfront Cottage", city: "Port Harcourt", neighbourhood: "Old GRA", owner_id: "OW7", owner_name: "Amara Dike", status: "approved", bedrooms: 3, bathrooms: 2, max_guests: 6, nightly_price_minor: 60000, currency: "GBP", extended_checkout_offered: true, extended_checkout_price_minor: 24000, bookings_count: 0, revenue_minor: 0, image_url: "" },
  ];
}

export function getAdminUsers(): UserRecord[] {
  return [
    { id: "U001", name: "Chidi Okafor", email: "chidi.o@email.com", type: "Guest", bookings_or_properties: 2, status: "active" },
    { id: "U002", name: "Folake Adeyemi", email: "folake.a@email.com", type: "Guest", bookings_or_properties: 1, status: "active" },
    { id: "U003", name: "Adaora Mensah", email: "a.mensah@mail.com", type: "Owner", bookings_or_properties: 2, status: "active" },
    { id: "U004", name: "Kola Ogun", email: "kola.o@email.com", type: "Owner", bookings_or_properties: 1, status: "active" },
    { id: "U005", name: "Emeka Nwosu", email: "emeka.n@email.com", type: "Guest", bookings_or_properties: 1, status: "active" },
  ];
}

export function getAdminAudit(): AuditEntry[] {
  return [
    { action: "Property suspended", target: "Ikoyi Garden Villa", by: "Admin", date: `${yyyy}-${mm}-10 14:23`, detail: "Suspended — repeated quality complaints" },
    { action: "Damage claim approved", target: "C001 — £350", by: "Admin", date: `${yyyy}-${mm}-08 10:15`, detail: "Approved — photos verified, amount deducted from deposit" },
    { action: "Operator created", target: "Yetunde Bakare", by: "Admin", date: `${yyyy}-${mm}-05 09:30`, detail: "Assigned to Lagos — onboarding in progress" },
    { action: "Refund issued", target: "Booking #B001", by: "Admin", date: `${yyyy}-${mm}-03 16:45`, detail: "Guest cancellation — prorated refund of £420" },
    { action: "Property approved", target: "Lekki Beach House", by: "Admin", date: `${yyyy}-05-28 11:00`, detail: "Approved after resubmission — quality check passed" },
  ];
}

export function getOwnerProperties() {
  return [
    { name: "The Palms Maisonette", unit: "Unit 1", meta: "2 BR · 4 guests max · 2nd floor", monthly_minor: 180000, bookings: "3", occ: "92%", active: true },
    { name: "Sunset Dove", unit: "Unit 2", meta: "1 BR · 2 guests max · 5th floor", monthly_minor: 120000, bookings: "2", occ: "78%", active: true },
  ];
}

/* ---------- Search ---------- */
import { getSeedProperties, getSeedReservations, getSeedBlocks, type SeedProperty } from "./seed-data";

export interface SearchOpts {
  where?: string;
  checkIn?: string;
  checkOut?: string;
}

export function searchProperties(opts: SearchOpts): SeedProperty[] {
  const all = getSeedProperties().filter((p) => p.status === "approved");

  /* where filter — city OR neighbourhood, case-insensitive */
  let results = all;
  if (opts.where) {
    const q = opts.where.toLowerCase();
    results = all.filter(
      (p) => p.city.toLowerCase().includes(q) || p.neighbourhood.toLowerCase().includes(q),
    );
  }

  /* availability filter — only if both dates given */
  if (opts.checkIn && opts.checkOut) {
    const inDate = new Date(opts.checkIn);
    const outDate = new Date(opts.checkOut);
    const reservations = getSeedReservations();
    const blocks = getSeedBlocks();

    results = results.filter((p) => {
      const hasOverlap =
        reservations.some(
          (r) =>
            r.property_id === p.id &&
            r.status !== "cancelled" &&
            new Date(r.check_in) < outDate &&
            new Date(r.check_out) > inDate,
        ) ||
        blocks.some(
          (b) =>
            b.property_id === p.id &&
            new Date(b.starts) < outDate &&
            new Date(b.ends) > inDate,
        );
      return !hasOverlap;
    });
  }

  return results;
}

export function getLocations(): { cities: string[]; neighbourhoods: string[] } {
  const props = getSeedProperties().filter((p) => p.status === "approved");
  const cities = [...new Set(props.map((p) => p.city))].sort();
  const neighbourhoods = [...new Set(props.map((p) => p.neighbourhood))].sort();
  return { cities, neighbourhoods };
}
