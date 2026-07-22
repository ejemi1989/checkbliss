import type { Metadata } from "next";
import { HomePageClient } from "./landing-client";

export const dynamic = "force-static";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  title: "CheckinBliss — The premium way to stay in Africa",
  description:
    "Hand-selected apartments in Lagos and Abuja. Instantly bookable from anywhere. Verified short-stay apartments built for the diaspora.",
};

export default function Home() {
  return <HomePageClient />;
}
