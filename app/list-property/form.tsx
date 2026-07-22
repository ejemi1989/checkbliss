"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { submitPropertyInterest } from "@/actions/list-property";
import { Footer } from "@/components/footer";

export function ListPropertyForm() {
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (formData: FormData) => {
    setPending(true);
    setError(null);
    try {
      const result = await submitPropertyInterest(formData);
      if (result.ok) {
        setSubmitted(true);
      } else {
        setError(result.message ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setPending(false);
  }, []);

  if (submitted) {
    return (
      <div className="p-8 rounded-2xl bg-card border border-hairline text-center">
        <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="font-display text-xl font-medium text-ink mb-2">Thanks — your city operator will follow up within 48 hours.</h2>
        <p className="text-sm text-ink-secondary mb-6">We&apos;ve received your details. Expect a WhatsApp message or call from your local operator.</p>
        <Link href="/" className="inline-block text-sm font-medium text-primary hover:text-primary-dark underline underline-offset-4 transition-colors no-underline">Return home</Link>
      </div>
    );
  }

  return (
    <>
      <form action={handleSubmit} className="p-8 rounded-2xl bg-card border border-hairline space-y-5">
        {error && (
          <div className="p-3 rounded-xl bg-danger/10 text-danger text-sm font-medium">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-xs font-medium text-ink-secondary mb-1.5">Full name</label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Your full name"
            className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary text-ink placeholder:text-mute"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-ink-secondary mb-1.5">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@email.com"
              className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary text-ink placeholder:text-mute"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-xs font-medium text-ink-secondary mb-1.5">Phone</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              placeholder="+234 800 000 0000"
              className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary text-ink placeholder:text-mute"
            />
          </div>
        </div>

        <div>
          <label htmlFor="city" className="block text-xs font-medium text-ink-secondary mb-1.5">City</label>
          <select
            id="city"
            name="city"
            required
            className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary text-ink bg-white"
          >
            <option value="" disabled>Select a city</option>
            <option value="Lagos">Lagos</option>
            <option value="Abuja">Abuja</option>
          </select>
        </div>

        <div>
          <label htmlFor="address" className="block text-xs font-medium text-ink-secondary mb-1.5">Property address</label>
          <input
            id="address"
            name="address"
            type="text"
            required
            placeholder="Street, neighbourhood, city"
            className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary text-ink placeholder:text-mute"
          />
        </div>

        <div>
          <label htmlFor="bedrooms" className="block text-xs font-medium text-ink-secondary mb-1.5">Number of bedrooms</label>
          <input
            id="bedrooms"
            name="bedrooms"
            type="number"
            min={1}
            max={10}
            required
            defaultValue={1}
            className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary text-ink"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-xs font-medium text-ink-secondary mb-1.5">Brief description</label>
          <textarea
            id="description"
            name="description"
            rows={3}
            placeholder="Tell us about your apartment — any standout features, amenities, or details that make it special."
            className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary text-ink placeholder:text-mute resize-none font-sans"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full py-3 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait border-none"
        >
          {pending ? "Submitting..." : "Submit"}
        </button>

        <p className="text-xs text-mute text-center">
          A city operator will contact you via WhatsApp or email. No cost or commitment.
        </p>
      </form>
      <div className="mt-24">
        <Footer />
      </div>
    </>
  );
}
