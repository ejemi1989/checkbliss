import Link from "next/link";
import type { Metadata } from "next";
import { getCrmContacts } from "@/lib/crm-admin";
import { PageHeader } from "@/components/dashboard/page-header";
import { Section } from "@/components/dashboard/section";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusPill } from "@/components/dashboard/status-pill";
import { roleVariant } from "@/components/dashboard/crm-colors";
import { Icon } from "@/components/icons";

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
    <div>
      <PageHeader
        eyebrow="WhatsApp CRM"
        title="Owner & operator directory"
        description={`Contact hub for owners and operators you message. ${owners} owners · ${operators} operators.`}
      />

      <div className="flex gap-2 flex-wrap pb-10 mb-10 border-b border-hairline">
        <FilterPill href="/admin/crm/contacts" active={!role && !city} label={`All (${owners + operators})`} />
        <FilterPill href="/admin/crm/contacts?role=owner" active={role === "owner"} label={`Owners (${owners})`} />
        <FilterPill href="/admin/crm/contacts?role=operator" active={role === "operator"} label={`Operators (${operators})`} />
        <span className="w-px bg-hairline mx-1 self-stretch" />
        <FilterPill href="/admin/crm/contacts?city=Lagos" active={city === "Lagos"} label="Lagos" />
        <FilterPill href="/admin/crm/contacts?city=Abuja" active={city === "Abuja"} label="Abuja" />
      </div>

      <Section eyebrow="Directory" count={contacts.length}>
        {contacts.length === 0 ? (
          <EmptyState
            title="No contacts match"
            body="Clear the filters to see all owners and operators, or wait for new profiles to be created."
            icon={<Icon.Users size={20} />}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {contacts.map((c) => (
              <Link
                key={c.id}
                href={`/admin/crm/inbox/${encodeURIComponent(c.phone_e164)}`}
                className="block bg-canvas border border-hairline rounded-xl p-6 transition-colors no-underline hover:border-primary"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-display text-lg tracking-tight text-ink">{c.name}</p>
                      <StatusPill variant={roleVariant(c.role)}>{c.role}</StatusPill>
                      {c.city && (
                        <StatusPill variant="neutral" dot uppercase>
                          {c.city}
                        </StatusPill>
                      )}
                    </div>
                    <p className="text-xs font-mono text-ink-tertiary mt-1.5">{c.phone_e164 || "—"}</p>
                  </div>
                  <StatusPill variant="success" dot>{c.status}</StatusPill>
                </div>

                <div className="pt-4 border-t border-hairline space-y-1.5 text-xs text-ink-secondary font-sans">
                  {c.role === "owner" && c.properties.length > 0 && (
                    <p>Units: <span className="text-ink">{c.properties.join(", ")}</span></p>
                  )}
                  {c.role === "operator" && (
                    <p>Inspections this month: <span className="text-ink font-mono">{c.inspections_done}</span></p>
                  )}
                  {c.last_message_body && (
                    <p className="truncate">
                      Last message: <span className="text-ink">&ldquo;{c.last_message_body}&rdquo;</span>
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function FilterPill({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-sans font-semibold transition-colors no-underline border ${
        active
          ? "border-primary bg-primary text-white"
          : "border-hairline bg-canvas text-ink-secondary hover:bg-bone-secondary"
      }`}
    >
      {label}
    </Link>
  );
}
