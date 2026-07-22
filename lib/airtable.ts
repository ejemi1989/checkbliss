"server only";

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const airtableConfigured = !!(AIRTABLE_BASE_ID && AIRTABLE_TOKEN);

export interface OnboardingRecord {
  propertyName: string;
  city: "Lagos" | "Abuja";
  address: string;
  bedrooms: number;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  status: "pending_inspection" | "awaiting_approval" | "approved" | "rejected";
  submittedAt: string;
  operatorName?: string;
}

export async function createOnboardingRecord(data: OnboardingRecord): Promise<{ ok: boolean; id?: string }> {
  if (!airtableConfigured) {
    console.log("[mock] Airtable record created:", data.propertyName);
    return { ok: true, id: "rec_mock_" + Date.now() };
  }

  try {
    const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Properties`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AIRTABLE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        records: [{
          fields: {
            "Property Name": data.propertyName,
            "City": data.city,
            "Address": data.address,
            "Bedrooms": data.bedrooms,
            "Owner Name": data.ownerName,
            "Owner Phone": data.ownerPhone,
            "Owner Email": data.ownerEmail,
            "Status": data.status,
            "Submitted At": data.submittedAt,
            "Operator": data.operatorName ?? "",
          }
        }]
      }),
    });
    if (!res.ok) throw new Error(`Airtable: ${res.status}`);
    const json = await res.json();
    return { ok: true, id: json.records?.[0]?.id };
  } catch (e) {
    console.error("Airtable create failed:", e);
    return { ok: false };
  }
}

export async function getOnboardingRecords(city?: string): Promise<OnboardingRecord[]> {
  if (!airtableConfigured) {
    return [
      { propertyName: "The Palms Maisonette", city: "Lagos", address: "15 Ahmadu Bello Way", bedrooms: 2, ownerName: "Adaora Mensah", ownerPhone: "+2348012345678", ownerEmail: "a.mensah@mail.com", status: "awaiting_approval", submittedAt: "2026-07-22", operatorName: "Tunde Ogunlade" },
      { propertyName: "Sunset Dove", city: "Lagos", address: "42 Bourdillon Road", bedrooms: 1, ownerName: "Adaora Mensah", ownerPhone: "+2348012345678", ownerEmail: "a.mensah@mail.com", status: "approved", submittedAt: "2026-07-15", operatorName: "Tunde Ogunlade" },
      { propertyName: "GRA Executive Suite", city: "Abuja", address: "Plot 12 GRA", bedrooms: 2, ownerName: "Ngozi Okonkwo", ownerPhone: "+2348023456789", ownerEmail: "ngozi.o@mail.com", status: "pending_inspection", submittedAt: "2026-07-22", operatorName: "Funke Adeyemi" },
    ];
  }

  try {
    let formula = "";
    if (city) formula = `&filterByFormula={City}="${city}"`;
    const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Properties?sort[0][field]=Submitted At&sort[0][direction]=desc${formula}`, {
      headers: { "Authorization": `Bearer ${AIRTABLE_TOKEN}` },
    });
    if (!res.ok) throw new Error(`Airtable: ${res.status}`);
    const json = await res.json();
    return (json.records ?? []).map((r: { fields: Record<string, string | number> }) => ({
      propertyName: r.fields["Property Name"] ?? "",
      city: r.fields["City"] ?? "Lagos",
      address: r.fields["Address"] ?? "",
      bedrooms: r.fields["Bedrooms"] ?? 1,
      ownerName: r.fields["Owner Name"] ?? "",
      ownerPhone: r.fields["Owner Phone"] ?? "",
      ownerEmail: r.fields["Owner Email"] ?? "",
      status: r.fields["Status"] ?? "pending_inspection",
      submittedAt: r.fields["Submitted At"] ?? "",
      operatorName: r.fields["Operator"] ?? "",
    }));
  } catch (e) {
    console.error("Airtable fetch failed:", e);
    return [];
  }
}
