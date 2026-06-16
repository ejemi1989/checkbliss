"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validateCredentials, createSessionToken, parseSessionToken, COOKIE_NAME, type AuthUser, type Role } from "@/lib/auth";

export async function loginAction(_prev: unknown, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const user = validateCredentials(email, password);
  if (!user) {
    return { error: "Invalid email or password" };
  }

  const token = createSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  const roleRoutes: Record<Role, string> = {
    admin: "/admin",
    operator: "/dashboard/operator",
    owner: "/dashboard/owner",
  };
  redirect(roleRoutes[user.role]);
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect("/login");
}

export async function getSession(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return parseSessionToken(token);
}
