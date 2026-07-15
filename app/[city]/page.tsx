import { redirect } from "next/navigation";

export default function CityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set("where", "Lagos");
  redirect(`/search?${searchParams.toString()}`);
}

export function generateStaticParams() {
  return [{ city: "lagos" }, { city: "abuja" }];
}
