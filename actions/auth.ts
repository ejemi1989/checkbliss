"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient, supabaseServerConfigured } from "@/lib/supabase/server";
import { createAdmin } from "@/lib/supabase/admin";
import type { AuthUser, Role } from "@/lib/auth";
import { mockOperatorCities } from "@/lib/auth";

const roleRoutes: Record<Role, string> = {
  admin: "/admin",
  operator: "/dashboard/operator",
  owner: "/dashboard/owner",
};

const MOCK_SESSION_COOKIE = "cb_mock_session";

/** Build a mock AuthUser from an email (mock mode only). */
function mockUserFromEmail(email: string): AuthUser {
  if (email === "admin@checkbliss.com") {
    return { id: "mock-admin", email, role: "admin", name: "Admin" };
  }
  if (email === "owner@checkbliss.com") {
    return { id: "mock-owner", email, role: "owner", name: "Adaora Mensah" };
  }
  // operator variants
  const cities = mockOperatorCities(email);
  const name =
    email === "operator-lagos@checkbliss.com"
      ? "Tunde Ogunlade"
      : email === "operator-abuja@checkbliss.com"
        ? "Funke Adeyemi"
        : "City Operator";
  return {
    id: `mock-operator-${email.split("@")[0]}`,
    email,
    role: "operator",
    name,
    assignedCities: cities,
  };
}

export async function loginAction(_prev: unknown, formData: FormData) {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  if (!supabaseServerConfigured) {
    // Mock login — accept demo credentials.
    // Per structure.md: operators are city-scoped. Demo operator emails
    // encode their city: operator-lagos@..., operator-abuja@...; the
    // legacy operator@... is treated as multi-city (Lagos + Abuja).
    const validEmails = [
      "admin@checkbliss.com",
      "operator-lagos@checkbliss.com",
      "operator-abuja@checkbliss.com",
      "operator@checkbliss.com",
      "owner@checkbliss.com",
    ];
    if (!validEmails.includes(email) || password !== "checkbliss-demo-2026") {
      return { error: "Invalid email or password." };
    }
    // Persist mock session so getSession() can return the right user.
    const cookieStore = await cookies();
    cookieStore.set(MOCK_SESSION_COOKIE, email, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });
    if (email === "admin@checkbliss.com") {
      redirect("/admin");
    }
    if (email.startsWith("operator") || email === "operator@checkbliss.com") {
      redirect("/dashboard/operator");
    }
    if (email === "owner@checkbliss.com") {
      redirect("/dashboard/owner");
    }
    redirect("/login");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: error?.message ?? "Invalid email or password." };
  }

  const admin = createAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, full_name, assigned_cities")
    .eq("id", data.user.id)
    .single();

  if (!profile) {
    await supabase.auth.signOut();
    return {
      error: "Account exists but no profile is configured. Contact an administrator.",
    };
  }

  redirect(roleRoutes[profile.role as Role] ?? "/login");
}

export async function signupAction(_prev: unknown, formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const phone = (formData.get("phone") as string)?.trim();
  const role = formData.get("role") as string;
  const city = (formData.get("city") as string)?.trim();
  const property = (formData.get("property") as string)?.trim();
  const country = (formData.get("country") as string)?.trim();
  const password = formData.get("password") as string;

  if (!name || !email || !phone || !password || !role || !country) {
    return { error: "All required fields must be filled." };
  }

  if (role !== "operator" && role !== "owner") {
    return { error: "Please select a valid role." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  if (!supabaseServerConfigured) {
    return { success: true, message: "Account created (mock mode)." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name, role, phone, city, property, country },
    },
  });

  if (error || !data.user) {
    return { error: error?.message ?? "Sign-up failed." };
  }

  const admin = createAdmin();
  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: data.user.id,
      role,
      full_name: name,
      email,
      whatsapp_e164: phone.startsWith("+") ? phone : `+${phone}`,
      whatsapp_opt_in: false,
      country_of_residence: country,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    return { error: `Auth account created but profile setup failed: ${profileError.message}` };
  }

  return { success: true, role };
}

export async function logoutAction() {
  if (!supabaseServerConfigured) {
    const cookieStore = await cookies();
    cookieStore.delete(MOCK_SESSION_COOKIE);
    redirect("/login");
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function getSession(): Promise<AuthUser | null> {
  if (!supabaseServerConfigured) {
    const cookieStore = await cookies();
    const mockEmail = cookieStore.get(MOCK_SESSION_COOKIE)?.value;
    if (!mockEmail) return null;
    return mockUserFromEmail(mockEmail);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  // structure.md: operators are scoped to assigned cities. In Supabase
  // mode we read the assigned_cities array from the operators table.
  let assignedCities: string[] | undefined;
  if (profile.role === "operator") {
    const { data: opRow } = await admin
      .from("operators")
      .select("assigned_cities")
      .eq("profile_id", user.id)
      .maybeSingle();
    if (opRow?.assigned_cities) {
      assignedCities = opRow.assigned_cities as string[];
    }
  }

  return {
    id: user.id,
    email: profile.email ?? user.email ?? "",
    role: profile.role as Role,
    name: profile.full_name ?? user.email ?? "User",
    assignedCities,
  };
}
