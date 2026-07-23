"use client";

import type { OwnerDirectoryEntry } from "@/lib/data";

export function WhatsAppOwnerList({ owners }: { owners: OwnerDirectoryEntry[] }) {
  if (owners.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-hairline p-6">
        <h2 className="font-sans text-base font-semibold text-ink mb-2">Your property owners</h2>
        <p className="text-sm text-mute">No owners in your assigned cities yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-hairline p-6">
      <h2 className="font-sans text-base font-semibold text-ink mb-1">Your property owners</h2>
      <p className="text-xs text-ink-secondary mb-5">Direct WhatsApp contact for each owner. Click to message them.</p>
      <div className="space-y-2">
        {owners.map((o) => (
          <div key={o.id} className="flex items-center justify-between p-4 rounded-xl border border-hairline hover:bg-primary-bg transition-colors">
            <div>
              <p className="font-sans text-sm font-semibold text-ink">{o.name}</p>
              <p className="text-xs text-ink-secondary">{o.whatsapp ?? "No phone"} · {o.email}</p>
              <p className="text-xs text-mute mt-0.5">{o.properties_count ?? "—"} properties</p>
            </div>
            <a
              href={`https://wa.me/${(o.whatsapp ?? "").replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl text-sm font-medium bg-success/10 text-success hover:bg-success/20 transition-colors no-underline shrink-0"
            >
              Message on WhatsApp
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
