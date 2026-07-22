import type { Metadata } from "next";
import { getSession } from "@/actions/auth";
import { OperatorVerification } from "./verification-client";

export function generateMetadata(): Metadata {
  return { title: "Operator — Verification", robots: { index: false, follow: false } };
}

export default async function OperatorVerificationPage() {
  const user = await getSession();
  return <OperatorVerification user={user} />;
}
