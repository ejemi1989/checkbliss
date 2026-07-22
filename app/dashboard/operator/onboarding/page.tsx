import type { Metadata } from "next";
import { getSession } from "@/actions/auth";
import { OperatorOnboarding } from "./onboarding-client";

export function generateMetadata(): Metadata {
  return { title: "Operator — Onboarding", robots: { index: false, follow: false } };
}

export default async function OperatorOnboardingPage() {
  const user = await getSession();
  return <OperatorOnboarding user={user} />;
}
