import type { Metadata } from "next";
import { ListingsClient, type ListingProperty } from "../listings-client";

export const metadata: Metadata = {
  title: "Lagos Apartments — CheckinBliss",
  description: "Verified premium apartments in Victoria Island, Ikoyi, Lekki and across Lagos, built for diaspora travellers. Hand-selected, inspected in person, and re-verified monthly.",
  alternates: { canonical: "/lagos" },
};

const LAGOS_PROPERTIES: ListingProperty[] = [
  { id: "p1", kicker: "Victoria Island", title: "Lagoon View Loft", meta: "1 bed · 1 bath · up to 2 guests", tags: ["free-cancellation"], price: 240, beds: 1, img: "/assets/images/stays/lagos-lagoon-living.avif", href: "/lagos/victoria-island/ocean-parade-towers/lagoon-view-loft", lat: 6.4295, lng: 3.4219 },
  { id: "p2", kicker: "Ikoyi", title: "Sunset Dove", meta: "1 bed · 1 bath · up to 2 guests", tags: ["free-cancellation"], price: 160, beds: 1, href: "/lagos/ikoyi/the-wings-complex/sunset-dove", lat: 6.4310, lng: 3.4155 },
  { id: "p3", kicker: "Victoria Island", title: "The Palms Maisonette", meta: "2 bed · 2 bath · up to 4 guests", tags: ["pool", "free-cancellation"], price: 210, beds: 2, img: "/assets/images/stays/maisonettes.avif", href: "/lagos/victoria-island/ahmadu-bello-mansions/the-palms-maisonette", lat: 6.4258, lng: 3.4489 },
  { id: "p4", kicker: "GRA", title: "GRA Executive Suite", meta: "1 bed · 1 bath · up to 2 guests", tags: ["workspace", "free-cancellation"], price: 175, beds: 1, href: "/lagos/gra/diplomatic-gardens/gra-executive-suite", lat: 6.4483, lng: 3.4444 },
  { id: "p5", kicker: "Ikoyi", title: "Ikoyi Courtyard Suite", meta: "1 bed · 1 bath · up to 2 guests", tags: ["free-cancellation"], price: 180, beds: 1, href: "/lagos/ikoyi/bourdillon-place/ikoyi-courtyard-suite", lat: 6.4415, lng: 3.4736 },
  { id: "p6", kicker: "Lekki Phase 1", title: "Lekki Lagoon House", meta: "2 bed · 2 bath · up to 4 guests", tags: ["pool", "free-cancellation"], price: 280, beds: 2, href: "/lagos/lekki-phase-1/lagoon-edge-estate/lekki-lagoon-house", lat: 6.4531, lng: 3.4324 },
  { id: "p7", kicker: "Surulere", title: "Surulere Music Room", meta: "1 bed · 1 bath · up to 2 guests", tags: ["workspace", "late-checkout"], price: 150, beds: 1, href: "/lagos/surulere/ita-faaji-lofts/surulere-music-room", lat: 6.4271, lng: 3.4098 },
  { id: "p8", kicker: "Yaba", title: "Yaba Hub Studio", meta: "Studio · 1 bath · up to 1 guest", tags: ["workspace"], price: 140, beds: 1, href: "/lagos/yaba/tech-bridge-house/yaba-hub-studio", lat: 6.4566, lng: 3.4288 },
  { id: "p9", kicker: "Banana Island", title: "Banana Island Villa", meta: "3 bed · 3 bath · up to 6 guests", tags: ["pool", "gym", "free-cancellation"], price: 450, beds: 3, href: "/lagos/banana-island/banana-island-estate/banana-island-villa", lat: 6.4362, lng: 3.5124 },
  { id: "p10", kicker: "Victoria Island", title: "Sixth Floor Vista", meta: "1 bed · 1 bath · up to 2 guests", tags: ["pool", "gym", "free-cancellation"], price: 220, beds: 1, href: "/lagos/victoria-island/marina-heights/sixth-floor-vista", lat: 6.4498, lng: 3.4381 },
  { id: "p11", kicker: "Lekki Phase 1", title: "Lekki Garden Duplex", meta: "2 bed · 2 bath · up to 4 guests", tags: ["workspace", "free-cancellation"], price: 320, beds: 2, href: "/lagos/lekki-phase-1/garden-court-estate/lekki-garden-duplex", lat: 6.4288, lng: 3.4267 },
  { id: "p12", kicker: "Ikoyi", title: "Awolowo Residence", meta: "2 bed · 2 bath · up to 4 guests", tags: ["free-cancellation"], price: 260, beds: 2, href: "/lagos/ikoyi/awolowo-place/awolowo-residence", lat: 6.4241, lng: 3.4527 },
  { id: "p13", kicker: "Surulere", title: "Surulere Attic Loft", meta: "1 bed · 1 bath · up to 2 guests", tags: ["late-checkout"], price: 160, beds: 1, href: "/lagos/surulere/bode-thomas-house/surulere-attic-loft", lat: 6.4602, lng: 3.4210 },
  { id: "p14", kicker: "Banana Island", title: "Banana Island Terrace", meta: "3 bed · 3 bath · up to 6 guests", tags: ["pool", "gym", "free-cancellation"], price: 500, beds: 3, href: "/lagos/banana-island/parkview-estate/banana-island-terrace", lat: 6.4448, lng: 3.4802 },
  { id: "p15", kicker: "Yaba", title: "Yaba Fibre Studio", meta: "Studio · 1 bath · up to 1 guest", tags: ["workspace"], price: 140, beds: 1, href: "/lagos/yaba/herbert-macaulay-house/yaba-fibre-studio", lat: 6.4467, lng: 3.4515 },
  { id: "p16", kicker: "Victoria Island", title: "Victoria Island Garden Flat", meta: "1 bed · 1 bath · up to 2 guests", tags: ["pool", "free-cancellation"], price: 200, beds: 1, href: "/lagos/victoria-island/river-valley-estate/victoria-island-garden-flat", lat: 6.4325, lng: 3.4341 },
];

export default function LagosPage() {
  return (
    <ListingsClient
      city="Lagos"
      eyebrow="Remarkably"
      properties={LAGOS_PROPERTIES}
      totalCount={LAGOS_PROPERTIES.length}
    />
  );
}
