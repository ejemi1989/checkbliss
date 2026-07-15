import Link from "next/link";
import type { Metadata } from "next";
import { getCrmContacts } from "@/lib/crm-admin";

export const metadata: Metadata = { title: "Contacts · WhatsApp CRM" };

type SearchParams = Promise<{ role?: string; city?: string }>;

export default async function CrmContactsPage({ searchParams }: { searchParams: SearchParams }) {
  const { role: roleRaw, city: cityRaw } = await searchParams;
  const role = roleRaw === "owner" || roleRaw === "operator" ? roleRaw : undefined;
  const city = cityRaw === "Lagos" || cityRaw === "Abuja" ? cityRaw : undefined;
  const contacts = await getCrmContacts({ role, city });

  const owners = contacts.filter((c) => c.role === "owner").length;
  const operators = contacts.filter((c) => c.role === "operator").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-sans text-[clamp(1.8rem,3vw,2.4rem)] font-medium leading-tight text-ink">Owner & Operator Directory</h1>
        <p className="text-sm text-ink-secondary mt-1">{owners} owners · {operators} operators</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <FilterPill href="/admin/crm/contacts" active={!role && !city} label={`All (${owners + operators})`} />
        <FilterPill href="/admin/crm/contacts?role=owner" active={role === "owner"} label={`Owners (${owners})`} />
        <FilterPill href="/admin/crm/contacts?role=operator" active={role === "operator"} label={`Operators (${operators})`} />
        <span className="w-px bg-hairline mx-1" />
        <FilterPill href="/admin/crm/contacts?city=Lagos" active={city === "Lagos"} label="Lagos" />
        <FilterPill href="/admin/crm/contacts?city=Abuja" active={city === "Abuja"} label="Abuja" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {contacts.map((c) => (
          <Link
            key={c.id}
            href={`/admin/crm/inbox/${encodeURIComponent(c.phone_e164)}`}
            className="block bg-white border border-hairline rounded-xl p-5 hover:border-primary transition-colors no-underline"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-sans text-base font-medium text-ink">{c.name}</p>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      c.role === "owner" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {c.role}
                  </span>
                  {c.city && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-bone text-ink-secondary">{c.city}</span>}
                </div>
                <p className="text-xs font-mono text-ink-tertiary mt-1">{c.phone_e164 || "—"}</p>
              </div>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">{c.status}</span>
            </div>

            <div className="mt-3 pt-3 border-t border-hairline text-xs text-ink-secondary space-y-1">
              {c.role === "owner" && c.properties.length > 0 && (
                <p>Units: <span className="text-ink">{c.properties.join(", ")}</span></p>
              )}
              {c.role === "operator" && (
                <p>Inspections this month: <span className="text-ink font-mono">{c.inspections_done}</span></p>
              )}
              {c.last_message_body && (
                <p className="truncate">
                  Last message: <span className="text-ink">"{c.last_message_body}"</span>
                </p>
              )}
            </div>
          </Link>
        ))}
        {contacts.length === 0 && (
          <div className="col-span-2 p-12 text-center bg-white rounded-xl border border-hairline">
            <p className="font-sans text-lg text-ink">No contacts match the current filters</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterPill({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors no-underline ${
        active ? "bg-primary text-white border-primary" : "bg-white text-ink-secondary border-hairline hover:border-primary"
      }`}
    >
      {label}
    </Link>
  );
}
