import type { Metadata } from "next";
import Link from "next/link";
import { ListPropertyForm } from "./form";

export const metadata: Metadata = { title: "List Your Property — CheckinBliss" };

export default function ListPropertyPage() {
  return (
    <div className="min-h-screen bg-bone">
      <header className="border-b border-hairline bg-white px-8 py-4">
        <div className="max-w-[1240px] mx-auto flex items-center justify-between">
          <Link href="/" className="no-underline">
            <img src="/assets/images/logo/Logo1.png" alt="CheckinBliss" className="h-7 w-auto" />
          </Link>
          <Link href="/" className="text-sm text-ink-secondary hover:text-ink no-underline">Back to home</Link>
        </div>
      </header>

      <main className="max-w-[1240px] mx-auto px-6 py-section">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-10">
            <h1 className="font-display text-3xl md:text-4xl font-medium text-ink mb-3">List your property</h1>
            <p className="font-sans text-[15px] text-ink-secondary leading-relaxed">
              Own an exceptional apartment in Lagos or Abuja? Our city operators will inspect, verify, and onboard it — at no cost to you.
            </p>
          </div>

          <ListPropertyForm />
        </div>
      </main>
    </div>
  );
}
