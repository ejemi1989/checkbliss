import type { Metadata } from "next";
import { AdminOperatorsView } from "../operators-client";

export const metadata: Metadata = { title: "Admin — Operators" };

export default function AdminOperatorsPage() {
  return <AdminOperatorsView />;
}
