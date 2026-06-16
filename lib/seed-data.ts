export interface SeedProperty {
  id: string;
  slug: string;
  name: string;
  city: string;
  neighbourhood: string;
  description: string;
  amenities: string[];
  route_note: string;
  bedrooms: number;
  sleeps: number;
  nightly_rate_minor: number;
  deposit_minor: number;
  currency: string;
  extended_checkout_offered: boolean;
  extended_checkout_price_minor: number | null;
  is_featured: boolean;
  status: string;
  images: string[];
}

export interface SeedReservation {
  id: string;
  property_id: string;
  check_in: string;
  check_out: string;
  status: string;
}

export interface SeedBlock {
  property_id: string;
  starts: string;
  ends: string;
  source: string;
}

export function getSeedProperties(): SeedProperty[] {
  return [
    {
      id: "PR001",
      slug: "lagoon-view-loft",
      name: "Lagoon View Loft",
      city: "Lagos",
      neighbourhood: "Victoria Island",
      description: "Floor-to-ceiling windows frame the lagoon from this light-filled one-bedroom loft in the heart of Victoria Island. Minimalist interiors, curated art, and a private balcony make this the perfect base for exploring Lagos.",
      amenities: ["WiFi", "Air conditioning", "Washer", "Kitchen", "Balcony", "Pool access", "24/7 security"],
      route_note: "15 min from Lagos airport (LOS). Secure parking available in the building.",
      bedrooms: 1,
      sleeps: 2,
      nightly_rate_minor: 24000,
      deposit_minor: 10000,
      currency: "GBP",
      extended_checkout_offered: true,
      extended_checkout_price_minor: 9600,
      is_featured: true,
      status: "approved",
      images: [],
    },
    {
      id: "PR002",
      slug: "sunset-dove",
      name: "Sunset Dove",
      city: "Lagos",
      neighbourhood: "Ikoyi",
      description: "A tranquil Ikoyi retreat with rooftop sunset views across Lagos. Mid-century furniture meets Nigerian craftsmanship in this thoughtfully composed one-bedroom apartment.",
      amenities: ["WiFi", "Air conditioning", "Washer", "Kitchen", "Rooftop", "Gym", "Parking"],
      route_note: "20 min from LOS. Off Awolowo Road — easy taxi access.",
      bedrooms: 1,
      sleeps: 2,
      nightly_rate_minor: 16000,
      deposit_minor: 10000,
      currency: "GBP",
      extended_checkout_offered: true,
      extended_checkout_price_minor: 6400,
      is_featured: false,
      status: "approved",
      images: [],
    },
    {
      id: "PR003",
      slug: "the-palms-maisonette",
      name: "The Palms Maisonette",
      city: "Lagos",
      neighbourhood: "Victoria Island",
      description: "A spacious two-bedroom maisonette across two floors, featuring a private garden courtyard, dedicated workspace, and a fully equipped kitchen. Ideal for families or longer stays.",
      amenities: ["WiFi", "Air conditioning", "Washer", "Kitchen", "Garden", "Workspace", "Parking", "Generator backup"],
      route_note: "10 min from LOS. On Ahmadu Bello Way.",
      bedrooms: 2,
      sleeps: 4,
      nightly_rate_minor: 21000,
      deposit_minor: 15000,
      currency: "GBP",
      extended_checkout_offered: true,
      extended_checkout_price_minor: 8400,
      is_featured: true,
      status: "approved",
      images: [],
    },
    {
      id: "PR004",
      slug: "gra-executive-suite",
      name: "GRA Executive Suite",
      city: "Abuja",
      neighbourhood: "GRA",
      description: "A refined two-bedroom suite in the heart of GRA, Abuja's most prestigious district. Marble floors, a formal dining room, and a private terrace overlook the diplomatic quarter.",
      amenities: ["WiFi", "Air conditioning", "Washer", "Kitchen", "Terrace", "Pool", "Gym", "Parking", "Housekeeping"],
      route_note: "30 min from Abuja airport (ABV). In the GRA diplomatic zone.",
      bedrooms: 2,
      sleeps: 4,
      nightly_rate_minor: 55000,
      deposit_minor: 25000,
      currency: "GBP",
      extended_checkout_offered: true,
      extended_checkout_price_minor: 22000,
      is_featured: true,
      status: "approved",
      images: [],
    },
    {
      id: "PR005",
      slug: "maitama-garden-studios",
      name: "Maitama Garden Studios",
      city: "Abuja",
      neighbourhood: "Maitama",
      description: "Light-filled studio apartments in a lush garden compound in Maitama. Each unit opens onto a shared tropical garden. Minimal, modern, and perfectly positioned for exploring Abuja.",
      amenities: ["WiFi", "Air conditioning", "Kitchenette", "Garden", "Laundry service", "Security"],
      route_note: "25 min from ABV. Off Yakubu Gowon Crescent.",
      bedrooms: 1,
      sleeps: 2,
      nightly_rate_minor: 32000,
      deposit_minor: 10000,
      currency: "GBP",
      extended_checkout_offered: false,
      extended_checkout_price_minor: null,
      is_featured: false,
      status: "approved",
      images: [],
    },
    {
      id: "PR006",
      slug: "central-abuja-penthouse",
      name: "Central Abuja Penthouse",
      city: "Abuja",
      neighbourhood: "Central District",
      description: "A dramatic penthouse on the top floor of a Central District tower. Panoramic views across the capital, a private rooftop terrace, and interiors designed by a leading Lagos studio.",
      amenities: ["WiFi", "Air conditioning", "Washer", "Full kitchen", "Rooftop terrace", "Pool", "Gym", "Valet parking", "Concierge"],
      route_note: "20 min from ABV. Walking distance to the Millennium Tower.",
      bedrooms: 3,
      sleeps: 6,
      nightly_rate_minor: 75000,
      deposit_minor: 30000,
      currency: "GBP",
      extended_checkout_offered: true,
      extended_checkout_price_minor: 30000,
      is_featured: true,
      status: "approved",
      images: [],
    },
  ];
}

export function getSeedReservations(): SeedReservation[] {
  return [
    { id: "R001", property_id: "PR001", check_in: "2026-06-18", check_out: "2026-06-22", status: "confirmed" },
    { id: "R002", property_id: "PR002", check_in: "2026-06-20", check_out: "2026-06-24", status: "confirmed" },
    { id: "R003", property_id: "PR001", check_in: "2026-06-25", check_out: "2026-06-30", status: "confirmed" },
    { id: "R004", property_id: "PR002", check_in: "2026-07-01", check_out: "2026-07-04", status: "confirmed" },
    { id: "R005", property_id: "PR004", check_in: "2026-07-10", check_out: "2026-07-14", status: "confirmed" },
  ];
}

export function getSeedBlocks(): SeedBlock[] {
  return [
    { property_id: "PR003", starts: "2026-07-01", ends: "2026-07-10", source: "owner" },
    { property_id: "PR006", starts: "2026-08-15", ends: "2026-08-31", source: "owner" },
  ];
}
