import { permanentRedirect } from "next/navigation";
import { getSeedProperties } from "@/lib/seed-data";
import { propertyHref } from "@/lib/slug";
import { notFound } from "next/navigation";

export default async function StayRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const all = getSeedProperties().filter((p) => p.status === "approved");
  const s = slug.toLowerCase();
  const prop = all.find((p) => p.slug === slug)
    ?? all.find((p) => p.id.toLowerCase() === s)
    ?? all.find((p) => p.id.toLowerCase().replace(/^[a-z]+/, "") === s)
    ?? all.find((p) => p.id.toLowerCase() === `pr${s.replace(/^[a-z]+/, "")}`);
  if (!prop) notFound();

  permanentRedirect(propertyHref(prop));
}
