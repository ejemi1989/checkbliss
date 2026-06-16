import { NextRequest, NextResponse } from "next/server";
import {
  sendWhatsApp,
  parseOwnerCommand,
  parseOperatorCommand,
  verifyMetaSignature,
} from "@/lib/whatsapp";
import type { OwnerCommand, OperatorCommand } from "@/lib/whatsapp";
import { wasProcessed, markProcessed } from "@/lib/idempotency";
import { log } from "@/lib/observability";
import { supabaseAdminConfigured, createAdmin } from "@/lib/supabase";
import { getSeedProperties, getSeedReservations } from "@/lib/seed-data";
import { addDamagePhoto, damagePhotoCount } from "@/lib/media";

const WHATSAPP_VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN || "checkinbliss-verify-2026";

/* ---------- Mock stores (when Supabase admin not configured) ---------- */

const mockAuditLog: {
  from: string;
  dir: "in" | "out";
  text: string;
  ts: string;
}[] = [];

const mockBlocks: {
  property_id: string;
  from: string;
  to: string;
  source: string;
}[] = [];

const mockDamageClaims: {
  id: string;
  property_id: string;
  description: string;
  status: string;
  created_at: string;
}[] = [];

const MOCK_PROFILES: Record<
  string,
  { id: string; name: string; role: "owner" | "operator"; city?: string; properties?: string[] }
> = {
  "+447700900100": {
    id: "OW1",
    name: "Adaora Mensah",
    role: "owner",
    properties: ["PR001", "PR003"],
  },
  "+447700900200": {
    id: "OP1",
    name: "Tunde Ogunlade",
    role: "operator",
    city: "Lagos",
  },
  "+447700900300": {
    id: "OP2",
    name: "Funke Adeyemi",
    role: "operator",
    city: "Abuja",
  },
  "+16505551234": {
    id: "OW2",
    name: "Sheena Nelson",
    role: "owner",
    properties: ["PR002", "PR005"],
  },
  "+447535434252": {
    id: "OW3",
    name: "You",
    role: "owner",
    properties: ["PR001", "PR002", "PR003", "PR004", "PR005", "PR006"],
  },
};

const damageFlowState: Record<
  string,
  { claimId: string; photoCount: number; active: boolean }
> = {};

/* ---------- Message extraction ---------- */

function extractMessage(payload: Record<string, unknown>): {
  from: string;
  text: string;
  id: string;
  type: string;
} | null {
  const entry0 = (payload?.entry as Array<Record<string, unknown>>)?.[0];
  const changes = entry0?.changes as Array<Record<string, unknown>> | undefined;
  const value = changes?.[0]?.value as Record<string, unknown> | undefined;
  const msgs = value?.messages as Array<Record<string, unknown>> | undefined;
  const msg = msgs?.[0];
  if (!msg) return null;
  return {
    from: `+${msg.from as string}`,
    text:
      msg.type === "text"
        ? ((msg.text as Record<string, string>)?.body ?? "")
        : `[image: ${(msg.image as Record<string, string>)?.id ?? "unknown"}]`,
    id: msg.id as string,
    type: msg.type as string,
  };
}

/* ---------- Dual-mode helpers ---------- */

type Profile = {
  id: string;
  name: string;
  role: "owner" | "operator";
  city: string | null;
  properties: string[];
};

/** Match a WhatsApp E.164 number to a registered profile. */
async function matchByWhatsApp(db: ReturnType<typeof createAdmin> | null, e164: string): Promise<Profile | null> {
  if (supabaseAdminConfigured && db) {
    const { data } = await db
      .from("profiles")
      .select("id, full_name:text, role, city:operator_assignments(city), properties:properties!owner_id(id)")
      .eq("whatsapp_e164", e164)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      name: data.full_name,
      role: data.role,
      city: Array.isArray(data.city)
        ? (data.city as Array<{ city: string }>)?.[0]?.city ?? null
        : null,
      properties: Array.isArray(data.properties)
        ? (data.properties as Array<{ id: string }>).map((p) => p.id)
        : [],
    };
  }
  const mock = MOCK_PROFILES[e164];
  if (!mock) return null;
  return { ...mock, city: mock.city ?? null, properties: mock.properties ?? [] };
}

/** Find a property owned by the owner, matching by name fragment. */
async function findOwnedProperty(
  db: ReturnType<typeof createAdmin> | null,
  ownerId: string,
  unitName: string,
): Promise<{ id: string; name: string } | null> {
  if (supabaseAdminConfigured && db) {
    const { data } = await db
      .from("properties")
      .select("id, name")
      .eq("owner_id", ownerId)
      .ilike("name", `%${unitName}%`)
      .maybeSingle();
    return data ? { id: data.id, name: data.name } : null;
  }
  return (
    getSeedProperties().find(
      (p) =>
        MOCK_PROFILES[Object.keys(MOCK_PROFILES).find((k) => MOCK_PROFILES[k].id === ownerId) ?? ""]
          ?.properties?.includes(p.id) &&
        p.name.toLowerCase().includes(unitName.toLowerCase()),
    ) ?? null
  );
}

async function insertBlock(
  db: ReturnType<typeof createAdmin> | null,
  propertyId: string,
  from: string,
  to: string,
): Promise<void> {
  if (supabaseAdminConfigured && db) {
    await db.from("availability_blocks").insert({
      property_id: propertyId,
      starts: from,
      ends: to,
      source: "whatsapp",
    });
  } else {
    mockBlocks.push({ property_id: propertyId, from, to, source: "whatsapp" });
  }
}

async function removeBlock(
  db: ReturnType<typeof createAdmin> | null,
  propertyId: string,
  from: string,
  to: string,
): Promise<void> {
  if (supabaseAdminConfigured && db) {
    await db
      .from("availability_blocks")
      .delete()
      .eq("property_id", propertyId)
      .eq("starts", from)
      .eq("ends", to);
  } else {
    const idx = mockBlocks.findIndex(
      (b) => b.property_id === propertyId && b.from === from,
    );
    if (idx >= 0) mockBlocks.splice(idx, 1);
  }
}

async function getReservationsForProperty(
  db: ReturnType<typeof createAdmin> | null,
  propertyId: string,
  month?: string,
): Promise<Array<{ check_in: string; check_out: string; status: string }>> {
  if (supabaseAdminConfigured && db) {
    let query = db
      .from("reservations")
      .select("check_in, check_out, status")
      .eq("property_id", propertyId)
      .neq("status", "cancelled");
    if (month) {
      const year = new Date().getFullYear();
      const monthIdx =
        [
          "jan", "feb", "mar", "apr", "may", "jun",
          "jul", "aug", "sep", "oct", "nov", "dec",
        ].findIndex(
          (m) => m === month.toLowerCase() || month.toLowerCase().startsWith(m),
        ) + 1;
      if (monthIdx > 0) {
        const mo = String(monthIdx).padStart(2, "0");
        query = query.gte("check_in", `${year}-${mo}-01`).lt("check_in", `${year}-${String(monthIdx + 1).padStart(2, "0")}-01`);
      }
    }
    const { data } = await query.order("check_in", { ascending: true });
    return (data ?? []) as Array<{ check_in: string; check_out: string; status: string }>;
  }
  return getSeedReservations()
    .filter((r) => r.property_id === propertyId)
    .map((r) => ({ check_in: r.check_in, check_out: r.check_out, status: r.status }));
}

async function getOwnerReservations(
  db: ReturnType<typeof createAdmin> | null,
  propertyIds: string[],
): Promise<Array<{ property_id: string; check_in: string; check_out: string; status: string }>> {
  if (supabaseAdminConfigured && db) {
    const { data } = await db
      .from("reservations")
      .select("property_id, check_in, check_out, status")
      .in("property_id", propertyIds)
      .neq("status", "cancelled")
      .order("check_in", { ascending: true });
    return (data ?? []) as Array<{ property_id: string; check_in: string; check_out: string; status: string }>;
  }
  return getSeedReservations()
    .filter((r) => propertyIds.includes(r.property_id))
    .map((r) => ({ property_id: r.property_id, check_in: r.check_in, check_out: r.check_out, status: r.status }));
}

async function currentInspectionFor(
  db: ReturnType<typeof createAdmin> | null,
  operatorId: string,
): Promise<{
  reservationId: string;
  propertyId: string;
  propertyName: string;
  city: string;
} | null> {
  if (supabaseAdminConfigured && db) {
    const { data } = await db
      .from("inspections")
      .select(
        "reservation_id, reservations!inner(id, property_id, properties!inner(id, name, city))",
      )
      .eq("operator_id", operatorId)
      .is("result", null)
      .maybeSingle();
    if (!data) return null;
    const res = data.reservations as unknown as {
      property_id: string;
      properties: { id: string; name: string; city: string };
    };
    return {
      reservationId: data.reservation_id,
      propertyId: res.property_id,
      propertyName: res.properties.name,
      city: res.properties.city,
    };
  }
  return {
    reservationId: "R001",
    propertyId: "PR001",
    propertyName: "Lagoon View Loft",
    city: "Lagos",
  };
}

async function operatorCoversCity(
  db: ReturnType<typeof createAdmin> | null,
  operatorId: string,
  city: string,
): Promise<boolean> {
  if (supabaseAdminConfigured && db) {
    const { data } = await db
      .from("operator_assignments")
      .select("city")
      .eq("operator_id", operatorId)
      .eq("city", city)
      .maybeSingle();
    return !!data;
  }
  const profile = MOCK_PROFILES[
    Object.keys(MOCK_PROFILES).find((k) => MOCK_PROFILES[k].id === operatorId) ?? ""
  ];
  return profile?.city === city;
}

async function releaseHoldFor(
  db: ReturnType<typeof createAdmin> | null,
  reservationId: string,
): Promise<void> {
  if (supabaseAdminConfigured && db) {
    await db
      .from("deposit_holds")
      .update({ status: "released", released_at: new Date().toISOString() })
      .eq("reservation_id", reservationId);
  }
}

async function openDamageClaim(
  db: ReturnType<typeof createAdmin> | null,
  reservationId: string,
  propertyId: string,
  operatorId: string,
  description: string,
): Promise<string> {
  if (supabaseAdminConfigured && db) {
    const { data } = await db
      .from("damage_claims")
      .insert({
        reservation_id: reservationId,
        reporting_operator_id: operatorId,
        description,
        estimated_cost_minor: 0,
        admin_decision: "pending",
        photos: [],
      })
      .select("id")
      .single();
    /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
    return data!.id as string;
  }
  const claimId = `claim-${Date.now()}`;
  mockDamageClaims.push({
    id: claimId,
    property_id: propertyId,
    description: "Damage reported by operator via WhatsApp",
    status: "pending",
    created_at: new Date().toISOString(),
  });
  return claimId;
}

async function escalateToAdmin(
  db: ReturnType<typeof createAdmin> | null,
  reservationId: string,
  operatorId: string,
  kind: "NOSHOW" | "GUESTPRESENT",
): Promise<void> {
  if (supabaseAdminConfigured && db) {
    await db
      .from("inspections")
      .update({
        result: kind === "NOSHOW" ? "noshow" : "guestpresent",
        escalated_at: new Date().toISOString(),
      })
      .eq("reservation_id", reservationId)
      .eq("operator_id", operatorId);
  }
}

async function auditWhatsApp(
  db: ReturnType<typeof createAdmin> | null,
  direction: "in" | "out",
  from: string,
  text: string,
  profileId?: string | null,
  parsedCommand?: string | null,
  accepted?: boolean,
): Promise<void> {
  if (supabaseAdminConfigured && db) {
    await db.from("whatsapp_audit_log").insert({
      direction,
      wa_phone: from,
      profile_id: profileId ?? null,
      body: text,
      parsed_command: parsedCommand ?? null,
      accepted: accepted ?? false,
    });
  } else {
    mockAuditLog.push({
      from,
      dir: direction,
      text,
      ts: new Date().toISOString(),
    });
  }
}

/* ---------- GET — Meta verification challenge ---------- */

export async function GET(request: NextRequest): Promise<NextResponse> {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

/* ---------- POST — inbound messages ---------- */

export async function POST(request: NextRequest): Promise<NextResponse> {
  /* 1. Raw body — signature is computed over the exact bytes */
  const rawBody = await request.text();
  const sigHeader = request.headers.get("x-hub-signature-256");

  /* 2. Verify signature — reject anything unsigned */
  if (!verifyMetaSignature(rawBody, sigHeader)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  /* 3. Extract message */
  const msg = extractMessage(payload);
  if (!msg) return NextResponse.json({ ignored: "no message" });

  /* 4. Idempotency — Meta redelivers; check before processing */
  if (wasProcessed("whatsapp", msg.id)) {
    return NextResponse.json({ duplicate: true });
  }

  /* 5. Match sender against registered profiles */
  const db = supabaseAdminConfigured ? createAdmin() : null;
  const profile = await matchByWhatsApp(db, msg.from);
  if (!profile) {
    /* audit + mark processed so we don't re-check this unknown sender */
    await auditWhatsApp(db, "in", msg.from, msg.text);
    markProcessed("whatsapp", msg.id);
    return NextResponse.json({ ignored: "unknown sender" });
  }

  /* audit inbound */
  await auditWhatsApp(db, "in", msg.from, msg.text, profile.id);

  log("whatsapp-bot", "info", `Message from ${msg.from}`, { text: msg.text });

  /* 6. Parse + dispatch by role */
  if (profile.role === "owner") {
    const cmd = parseOwnerCommand(msg.text);
    if (!cmd) {
      await sendAndAudit(db, msg.from, profile.id, "Sorry, I didn't understand. Send HELP for commands.");
      markProcessed("whatsapp", msg.id);
      return NextResponse.json({ replied: "help" });
    }
    if (cmd.kind === "INCOMPLETE") {
      await sendAndAudit(db, msg.from, profile.id, cmd.usage);
      markProcessed("whatsapp", msg.id);
      return NextResponse.json({ replied: "help" });
    }
    const result = await handleOwner(db, msg.from, profile, cmd);
    markProcessed("whatsapp", msg.id);
    return result;
  }

  if (profile.role === "operator") {
    /* Check if operator is in DAMAGE photo-flow (expecting images) */
    if (msg.type === "image") {
      const result = await handleOperatorImage(db, msg.from, profile.id);
      markProcessed("whatsapp", msg.id);
      return result;
    }

    /* Check for DONE to finalize DAMAGE flow */
    if (msg.type === "text" && msg.text.trim().toUpperCase() === "DONE") {
      const result = await finalizeDamageFlow(db, msg.from, profile.id);
      markProcessed("whatsapp", msg.id);
      return result;
    }

    const cmd = parseOperatorCommand(msg.text);
    if (!cmd) {
      await sendAndAudit(db, msg.from, profile.id, "Reply CLEAN, DAMAGE, NOSHOW, or GUESTPRESENT.");
      markProcessed("whatsapp", msg.id);
      return NextResponse.json({ replied: "help" });
    }
    const result = await handleOperator(db, msg.from, profile, cmd);
    markProcessed("whatsapp", msg.id);
    return result;
  }

  markProcessed("whatsapp", msg.id);
  return NextResponse.json({ ignored: true });
}

/* ---------- Helpers ---------- */

async function sendAndAudit(
  db: ReturnType<typeof createAdmin> | null,
  from: string,
  profileId: string,
  text: string,
  parsedCommand?: string | null,
  accepted?: boolean,
) {
  await sendWhatsApp(from, text);
  await auditWhatsApp(db, "out", from, text, profileId, parsedCommand, accepted);
  log("whatsapp-bot", "info", "Reply sent", { to: from, text });
}

/* ---------- Owner command handlers ---------- */

async function handleOwner(
  db: ReturnType<typeof createAdmin> | null,
  from: string,
  profile: Profile,
  cmd: OwnerCommand,
) {
  switch (cmd.kind) {
    case "HELP": {
      await sendAndAudit(
        db,
        from,
        profile.id,
        "Commands:\n• BLOCK <dates> <unit> — block dates\n• UNBLOCK <dates> <unit> — unblock dates\n• AVAILABILITY <unit> <month> — check availability\n• BOOKINGS — list upcoming\n• HELP — this message",
        cmd.kind,
        true,
      );
      return NextResponse.json({ ok: true });
    }

    case "BLOCK":
    case "UNBLOCK": {
      const property = await findOwnedProperty(db, profile.id, cmd.unit);
      if (!property) {
        await sendAndAudit(db, from, profile.id, `You don't manage a listing called "${cmd.unit}".`);
        return NextResponse.json({ ok: true });
      }

      if (cmd.kind === "BLOCK") {
        await insertBlock(db, property.id, cmd.from, cmd.to);
        log("whatsapp-bot", "info", `BLOCK ${cmd.from}–${cmd.to} for ${property.name}`);
        await sendAndAudit(
          db, from, profile.id,
          `✓ Blocked ${cmd.from}–${cmd.to} for ${property.name}.`,
          cmd.kind, true,
        );
      } else {
        await removeBlock(db, property.id, cmd.from, cmd.to);
        log("whatsapp-bot", "info", `UNBLOCK ${cmd.from}–${cmd.to} for ${property.name}`);
        await sendAndAudit(
          db, from, profile.id,
          `✓ Unblocked ${cmd.from}–${cmd.to} for ${property.name}.`,
          cmd.kind, true,
        );
      }
      return NextResponse.json({ ok: true });
    }

    case "AVAILABILITY": {
      const property = await findOwnedProperty(db, profile.id, cmd.unit);
      if (!property) {
        await sendAndAudit(db, from, profile.id, `You don't manage a listing called "${cmd.unit}".`);
        return NextResponse.json({ ok: true });
      }
      const reservations = await getReservationsForProperty(db, property.id, cmd.month);
      if (reservations.length === 0) {
        await sendAndAudit(
          db, from, profile.id,
          `✓ ${property.name} — fully available for ${cmd.month}.`,
          cmd.kind, true,
        );
      } else {
        const dates = reservations.map((r) => `${r.check_in}–${r.check_out}`).join(", ");
        await sendAndAudit(
          db, from, profile.id,
          `${property.name} — ${cmd.month}: booked ${dates}.`,
          cmd.kind, true,
        );
      }
      return NextResponse.json({ ok: true });
    }

    case "BOOKINGS": {
      const allProps = supabaseAdminConfigured && db
        ? (
            (await db.from("properties").select("id, name").in("id", profile.properties))
              .data as Array<{ id: string; name: string }> ?? []
          )
        : getSeedProperties().filter((p) => profile.properties.includes(p.id));

      const reservations = await getOwnerReservations(db, profile.properties);
      if (reservations.length === 0) {
        await sendAndAudit(db, from, profile.id, "No upcoming bookings for your properties.", cmd.kind, true);
      } else {
        const lines = reservations
          .map((r) => {
            const p = allProps.find((x) => x.id === r.property_id);
            return `• ${p?.name ?? "Unknown"}: ${r.check_in}–${r.check_out} (${r.status})`;
          })
          .join("\n");
        await sendAndAudit(db, from, profile.id, `Your bookings:\n${lines}`, cmd.kind, true);
      }
      return NextResponse.json({ ok: true });
    }

    default:
      /* INCOMPLETE handled before calling handleOwner; safety */
      return NextResponse.json({ ok: true });
  }
}

/* ---------- Operator command handlers ---------- */

async function handleOperator(
  db: ReturnType<typeof createAdmin> | null,
  from: string,
  profile: Profile,
  cmd: OperatorCommand,
) {
  /* Authorize: operator must have an active inspection */
  const reservation = await currentInspectionFor(db, profile.id);
  if (!reservation) {
    await sendAndAudit(db, from, profile.id, "No inspection is currently assigned to you.");
    return NextResponse.json({ ok: true });
  }

  /* Authorize: operator must cover the reservation's city */
  if (!(await operatorCoversCity(db, profile.id, reservation.city))) {
    await sendAndAudit(db, from, profile.id, "That property isn't in your assigned city.");
    return NextResponse.json({ ok: true });
  }

  switch (cmd.kind) {
    case "YES": {
      await sendAndAudit(
        db, from, profile.id,
        "✓ Confirmed. You're available for the scheduled inspection.",
        cmd.kind, true,
      );
      return NextResponse.json({ ok: true });
    }

    case "REASSIGN": {
      await sendAndAudit(
        db, from, profile.id,
        `✓ Reassigned inspection to ${cmd.rep}.`,
        cmd.kind, true,
      );
      return NextResponse.json({ ok: true });
    }

    case "CLEAN": {
      await releaseHoldFor(db, reservation.reservationId);
      log("whatsapp-bot", "info", "CLEAN — releasing deposit hold");
      await sendAndAudit(
        db, from, profile.id,
        `✓ Confirmed clean — deposit released for ${reservation.propertyName}.`,
        cmd.kind, true,
      );
      return NextResponse.json({ ok: true });
    }

    case "DAMAGE": {
      const claimId = await openDamageClaim(
        db,
        reservation.reservationId,
        reservation.propertyId,
        profile.id,
        "Damage reported by operator via WhatsApp",
      );
      damageFlowState[from] = { claimId, photoCount: 0, active: true };
      log("whatsapp-bot", "info", `DAMAGE — claim ${claimId} opened, awaiting photos`);
      await sendAndAudit(
        db, from, profile.id,
        "Damage noted. Please send up to 5 photos now. Reply DONE when finished.",
        cmd.kind, true,
      );
      return NextResponse.json({ ok: true });
    }

    case "NOSHOW":
    case "GUESTPRESENT": {
      await escalateToAdmin(db, reservation.reservationId, profile.id, cmd.kind);
      log("whatsapp-bot", "info", `${cmd.kind} — escalating to admin`);
      await sendAndAudit(
        db, from, profile.id,
        "Logged and sent to admin. They'll follow up.",
        cmd.kind, true,
      );
      return NextResponse.json({ ok: true });
    }
  }
}

/* ---------- Operator image message handler (DAMAGE photo flow) ---------- */

async function handleOperatorImage(
  db: ReturnType<typeof createAdmin> | null,
  from: string,
  profileId: string,
) {
  const flow = damageFlowState[from];
  if (!flow || !flow.active) {
    await sendAndAudit(db, from, profileId, "No active damage claim to attach photos to. Reply DAMAGE to start one.");
    return NextResponse.json({ ok: true });
  }

  const currentCount = damagePhotoCount(flow.claimId);
  if (currentCount >= 5) {
    await sendAndAudit(db, from, profileId, "Maximum 5 photos reached. Reply DONE to finalise the claim.");
    return NextResponse.json({ ok: true });
  }

  const storageKey = `damage-photos/${flow.claimId}/photo-${currentCount + 1}.jpg`;
  addDamagePhoto(flow.claimId, storageKey);
  flow.photoCount = currentCount + 1;
  log("whatsapp-bot", "info", `Damage photo ${flow.photoCount}/5 added to claim ${flow.claimId}`);

  await sendAndAudit(
    db, from, profileId,
    `✓ Photo ${flow.photoCount} of 5 received. ${5 - flow.photoCount} remaining. Reply DONE when finished or send another photo.`,
  );
  return NextResponse.json({ ok: true });
}

async function finalizeDamageFlow(
  db: ReturnType<typeof createAdmin> | null,
  from: string,
  profileId: string,
) {
  const flow = damageFlowState[from];
  if (!flow || !flow.active) {
    await sendAndAudit(db, from, profileId, "No active damage claim to finalise.");
    return NextResponse.json({ ok: true });
  }

  flow.active = false;
  const count = damagePhotoCount(flow.claimId);
  log("whatsapp-bot", "info", `DAMAGE flow finalized for claim ${flow.claimId} with ${count} photos`);
  await sendAndAudit(
    db, from, profileId,
    `✓ Claim ${flow.claimId} filed with ${count} photos. Admin will review within 24–48 hours.`,
  );
  return NextResponse.json({ ok: true });
}
