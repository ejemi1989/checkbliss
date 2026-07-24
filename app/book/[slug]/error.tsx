"use client";

import { useEffect } from "react";

export default function BookingError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Booking page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bone flex items-center justify-center px-8">
      <div className="max-w-md text-center space-y-4">
        <h1 className="font-display text-2xl font-medium text-ink">Something went wrong</h1>
        <p className="font-sans text-sm text-ink-secondary">
          We couldn&apos;t load this booking page. Please try again.
        </p>
        <p className="font-sans text-xs text-mute break-all">Error: {error.message || error.digest || "Unknown"}</p>
        <div className="flex gap-3 justify-center pt-4">
          <button
            onClick={() => unstable_retry()}
            className="px-6 py-3 rounded-[var(--radius-sm)] bg-brass text-bone font-sans text-sm font-semibold hover:bg-brass-dark transition-colors cursor-pointer border-none"
          >
            Try again
          </button>
          <a
            href="/"
            className="px-6 py-3 rounded-[var(--radius-sm)] border border-hairline text-sm font-medium text-ink-secondary hover:bg-bone-secondary transition-colors no-underline"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
