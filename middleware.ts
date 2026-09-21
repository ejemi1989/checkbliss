import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createClient, supabaseServerConfigured } from "@/lib/supabase/server";
import { createAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";
import { demoRoleForEmail, type Role } from "@/lib/auth";

const MOCK_SESSION_COOKIE = "cb_mock_session";

const roleRouteMap: Record<string, Role> = {
  "/admin": "admin",
  "/dashboard/operator": "operator",
  "/dashboard/owner": "owner",
};

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

  const { pathname } = request.nextUrl;
  const matchedPrefix = Object.keys(roleRouteMap).find((prefix) => pathname.startsWith(prefix));
  if (!matchedPrefix) return response;

  const requiredRole = roleRouteMap[matchedPrefix];

  // 1. Demo users in real mode authenticate via the mock cookie fallback.
  //    Accept that cookie as a valid session before checking Supabase auth.
  const mockEmail = request.cookies.get(MOCK_SESSION_COOKIE)?.value?.toLowerCase().trim();
  const mockRole = demoRoleForEmail(mockEmail);
  if (mockRole && mockRole === requiredRole) {
    return response;
  }

  // 2. If Supabase is not configured, the middleware in updateSession has
  //    already passed the request through (no auth check possible).
  if (!supabaseServerConfigured || !supabaseAdminConfigured) return response;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const admin = createAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== requiredRole) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
};
