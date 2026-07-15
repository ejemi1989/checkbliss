export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function propertyHref(p: {
  city: string;
  neighbourhood_slug?: string;
  building_slug?: string;
  slug: string;
}): string {
  const ns = p.neighbourhood_slug ?? slugify(p.city);
  const bs = p.building_slug ?? slugify("building");
  const cs = slugify(p.city);
  return `/${cs}/${ns}/${bs}/${p.slug}`;
}
