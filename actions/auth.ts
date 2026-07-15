"use server";

import { redirect } from "next/navigation";
import { createClient, supabaseServerConfigured } from "@/lib/supabase/server";
import { createAdmin } from "@/lib/supabase/admin";
import type { AuthUser, Role } from "@/lib/auth";

const roleRoutes: Record<Role, string> = {
  admin: "/admin",
  operator: "/dashboard/operator",
  owner: "/dashboard/owner",
};

export async function loginAction(_prev: unknown, formData: FormData) {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
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
    .select("role, full_name")
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
  const password = formData.get("password") as string;

  if (!name || !email || !phone || !password || !role) {
    return { error: "All required fields must be filled." };
  }

  if (role !== "operator" && role !== "owner") {
    return { error: "Please select a valid role." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name, role, phone, city, property },
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
    },
    { onConflict: "id" },
  );

  if (profileError) {
    return { error: `Auth account created but profile setup failed: ${profileError.message}` };
  }

  return { success: true, role };
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function getSession(): Promise<AuthUser | null> {
  if (!supabaseServerConfigured) return null;

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

  return {
    id: user.id,
    email: profile.email ?? user.email ?? "",
    role: profile.role as Role,
    name: profile.full_name ?? user.email ?? "User",
  };
}
