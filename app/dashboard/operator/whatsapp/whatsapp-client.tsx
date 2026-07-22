"use client";

import type { OwnerDirectoryEntry } from "@/lib/data";

export function CalendarSyncSection({ owners }: { owners: OwnerDirectoryEntry[] }) {
  return (
    <div className="bg-white rounded-xl border border-hairline p-6">
      <h2 className="font-sans text-base font-semibold text-ink mb-4">Property availability & calendar sync</h2>
      <p className="text-xs text-ink-secondary mb-4">Owners can sync their CheckinBliss bookings to their personal calendar. Share these links with your owners.</p>
      <div className="space-y-3">
        {owners.slice(0, 3).map((o) => (
          <div key={o.id} className="p-4 rounded-xl border border-hairline bg-primary-bg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink">{o.name}</p>
                <p className="text-xs text-ink-secondary mt-0.5">Calendar sync URL available for {o.properties_count ?? 0} properties</p>
              </div>
              <button
                onClick={() => navigator.clipboard?.writeText(`https://checkinbliss.com/api/calendar/${o.id}`)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-hairline text-ink-secondary hover:bg-white transition-colors cursor-pointer"
              >
                Copy sync link
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
