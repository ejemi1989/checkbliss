import type { Metadata } from "next";
import { getSession } from "@/actions/auth";
import { redirect } from "next/navigation";
import { getOwnersForCity } from "@/lib/data";
import { CalendarSyncSection } from "./whatsapp-client";

export const metadata: Metadata = { title: "Operator — WhatsApp", robots: { index: false, follow: false } };

export default async function OperatorWhatsAppPage() {
  const user = await getSession();
  if (!user || user.role !== "operator") redirect("/login");
  const cities = user.assignedCities ?? [];
  const owners = getOwnersForCity(cities);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-medium text-ink">WhatsApp Communication</h1>
        <p className="text-sm text-ink-secondary mt-1">Follow up with property owners in {cities.join(" & ")}. Automated messages are sent when bookings are confirmed and inspections are due.</p>
      </div>

      {/* Owner contacts */}
      <div className="bg-white rounded-xl border border-hairline p-6">
        <h2 className="font-sans text-base font-semibold text-ink mb-4">Your property owners</h2>
        <div className="space-y-2">
          {owners.map((o) => (
            <div key={o.id} className="flex items-center justify-between p-4 rounded-xl border border-hairline hover:bg-primary-bg transition-colors">
              <div>
                <p className="font-sans text-sm font-semibold text-ink">{o.name}</p>
                <p className="text-xs text-ink-secondary">{o.whatsapp} · {o.email}</p>
                <p className="text-xs text-mute mt-0.5">{o.properties_count ?? "—"} properties</p>
              </div>
              <a
                href={`https://wa.me/${(o.whatsapp ?? "").replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl text-sm font-medium bg-success/10 text-success hover:bg-success/20 transition-colors no-underline"
              >
                Message on WhatsApp
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Automated messages */}
      <div className="bg-white rounded-xl border border-hairline p-6">
        <h2 className="font-sans text-base font-semibold text-ink mb-4">Automated messages sent to owners</h2>
        <p className="text-xs text-ink-secondary mb-4">These templates are sent automatically by the system. No action needed from you.</p>
        <div className="space-y-3">
          {[
            { title: "New booking confirmed", desc: "Sent when a guest books a stay. Includes guest name, dates, and unit.", format: "WhatsApp template" },
            { title: "Pre-checkout notice", desc: "Sent 24 hours before guest checkout. Reminds owner of upcoming inspection.", format: "WhatsApp template" },
            { title: "Inspection result", desc: "Sent after you complete an inspection. CLEAN — deposit released. DAMAGE — claim filed.", format: "WhatsApp template" },
            { title: "Monthly verification due", desc: "Sent when a property is due for its monthly re-verification.", format: "WhatsApp template" },
          ].map((m) => (
            <div key={m.title} className="flex items-start justify-between p-3 rounded-lg bg-primary-bg">
              <div>
                <p className="text-sm font-medium text-ink">{m.title}</p>
                <p className="text-xs text-ink-secondary mt-0.5">{m.desc}</p>
              </div>
              <span className="text-[10px] font-semibold text-mute shrink-0 ml-4">{m.format}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar & Availability */}
      <CalendarSyncSection owners={owners} />
    </div>
  );
}
