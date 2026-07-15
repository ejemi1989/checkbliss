import type { MetadataRoute } from "next";
import { getAllApprovedPropertiesAsync } from "@/lib/data";
import { propertyHref } from "@/lib/slug";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const properties = await getAllApprovedPropertiesAsync();
  const base = "https://checkinbliss.com";

  return [
    {
      url: base,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${base}/lagos`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${base}/abuja`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...properties.map((p) => ({
      url: `${base}${propertyHref(p)}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
