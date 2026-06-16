import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseSessionToken, COOKIE_NAME, type Role } from "@/lib/auth";

const roleRouteMap: Record<string, Role> = {
  "/admin": "admin",
  "/dashboard/operator": "operator",
  "/dashboard/owner": "owner",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const requiredRole = roleRouteMap[pathname];
  if (!requiredRole) return NextResponse.next();

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const user = parseSessionToken(token);
  if (!user || user.role !== requiredRole) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
};
