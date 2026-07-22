import type { Metadata } from "next";
import { ListingsClient, type ListingProperty } from "../listings-client";

export const metadata: Metadata = {
  title: "Abuja Apartments — CheckinBliss",
  description: "Verified premium apartments in Maitama, Asokoro, Jabi and across Abuja, built for diaspora travellers. Hand-selected, inspected in person, and re-verified monthly.",
  alternates: { canonical: "/abuja" },
};

const ABUJA_PROPERTIES: ListingProperty[] = [
  { id: "a1", kicker: "Maitama", title: "Maitama Garden Studios", meta: "1 bed · 1 bath · up to 2 guests", tags: ["pool", "free-cancellation"], price: 220, beds: 1, href: "/abuja/maitama/yakubu-gowon-gardens/maitama-garden-studios", lat: 9.0695, lng: 7.4837 },
  { id: "a2", kicker: "Central District", title: "Central Abuja Penthouse", meta: "2 bed · 2 bath · up to 4 guests", tags: ["free-cancellation"], price: 280, beds: 2, href: "/abuja/central-district/millennium-tower-residences/central-abuja-penthouse", lat: 9.0574, lng: 7.4898 },
  { id: "a3", kicker: "Asokoro", title: "Asokoro State House View", meta: "3 bed · 3 bath · up to 6 guests", tags: ["pool", "free-cancellation"], price: 360, beds: 3, href: "/abuja/asokoro/presidential-gardens-estate/asokoro-state-house-view", lat: 9.0448, lng: 7.5182 },
  { id: "a4", kicker: "Wuse 2", title: "Wuse 2 Executive", meta: "2 bed · 2 bath · up to 4 guests", tags: ["workspace", "free-cancellation"], price: 200, beds: 2, href: "/abuja/wuse-2/adetokunbo-ademola-towers/wuse-2-executive", lat: 9.0764, lng: 7.4760 },
  { id: "a5", kicker: "Jabi", title: "Jabi Lake Studios", meta: "1 bed · 1 bath · up to 2 guests", tags: ["pool", "free-cancellation"], price: 195, beds: 1, href: "/abuja/jabi/lake-view-crescent/jabi-lake-studios", lat: 9.0844, lng: 7.4579 },
  { id: "a6", kicker: "Katampe", title: "Katampe Hill Residence", meta: "3 bed · 3 bath · up to 6 guests", tags: ["pool", "free-cancellation", "late-checkout"], price: 320, beds: 3, href: "/abuja/katampe/katampe-estate/katampe-hill-residence", lat: 9.0731, lng: 7.4798 },
  { id: "a7", kicker: "Durumi", title: "Durumi Garden Apartment", meta: "2 bed · 2 bath · up to 4 guests", tags: ["late-checkout"], price: 180, beds: 2, href: "/abuja/durumi/sunflower-estate/durumi-garden-apartment", lat: 9.0421, lng: 7.4523 },
  { id: "a8", kicker: "Guzape", title: "Guzape Contemporary", meta: "3 bed · 3 bath · up to 6 guests", tags: ["pool", "gym", "free-cancellation"], price: 380, beds: 3, href: "/abuja/guzape/hilltop-mews/guzape-contemporary", lat: 9.0644, lng: 7.5012 },
  { id: "a9", kicker: "Maitama", title: "Maitama Diplomatic Suite", meta: "4 bed · 4 bath · up to 8 guests", tags: ["pool", "gym", "late-checkout"], price: 480, beds: 4, href: "/abuja/maitama/diplomatic-drive-estate/maitama-diplomatic-suite", lat: 9.0712, lng: 7.4821 },
  { id: "a10", kicker: "GRA", title: "GRA Diplomatic Terrace", meta: "2 bed · 2 bath · up to 4 guests", tags: ["workspace", "free-cancellation"], price: 260, beds: 2, href: "/abuja/gra/constitutional-avenue-court/gra-diplomatic-terrace", lat: 9.0532, lng: 7.4934 },
  { id: "a11", kicker: "Central District", title: "Central District Presidential", meta: "3 bed · 3 bath · up to 6 guests", tags: ["pool", "free-cancellation"], price: 350, beds: 3, href: "/abuja/central-district/shehu-musa-yaradua-towers/central-district-presidential", lat: 9.0589, lng: 7.4865 },
  { id: "a12", kicker: "Asokoro", title: "Asokoro Garden Terrace", meta: "3 bed · 3 bath · up to 6 guests", tags: ["pool", "free-cancellation"], price: 340, beds: 3, href: "/abuja/asokoro/garden-terraces-estate/asokoro-garden-terrace", lat: 9.0462, lng: 7.5144 },
  { id: "a13", kicker: "Wuse 2", title: "Wuse 2 City Loft", meta: "2 bed · 2 bath · up to 4 guests", tags: ["workspace", "free-cancellation"], price: 210, beds: 2, href: "/abuja/wuse-2/ibrahim-babangida-boulevard/wuse-2-city-loft", lat: 9.0781, lng: 7.4732 },
  { id: "a14", kicker: "Jabi", title: "Jabi Lake Penthouse", meta: "3 bed · 3 bath · up to 6 guests", tags: ["pool", "free-cancellation"], price: 340, beds: 3, href: "/abuja/jabi/jabi-lake-tower/jabi-lake-penthouse", lat: 9.0812, lng: 7.4601 },
];

export default function AbujaPage() {
  return (
    <ListingsClient
      city="Abuja"
      eyebrow="Calmly"
      properties={ABUJA_PROPERTIES}
      totalCount={ABUJA_PROPERTIES.length}
    />
  );
}
