export type Role = "admin" | "operator" | "owner";

export interface AuthUser {
  email: string;
  role: Role;
  name: string;
}

export const AUTH_USERS: AuthUser[] = [
  { email: "admin@checkbliss.com", role: "admin", name: "Admin User" },
  { email: "operator@checkbliss.com", role: "operator", name: "Operator User" },
  { email: "owner@checkbliss.com", role: "owner", name: "Owner User" },
];

const COOKIE_NAME = "cb_session";

function getSecret(): string {
  return process.env.AUTH_SECRET || "checkbliss-dev-secret-do-not-use-in-production";
}

function encodeSession(user: AuthUser): string {
  const payload = `${user.email}|${user.role}|${user.name}|${Date.now()}`;
  const signature = btoa(payload + ":" + btoa(getSecret()).slice(0, 8));
  return btoa(payload) + "." + signature;
}

function decodeSession(token: string): AuthUser | null {
  try {
    const [encoded, _signature] = token.split(".");
    const decoded = atob(encoded);
    const [email, role, name] = decoded.split("|");
    const found = AUTH_USERS.find((u) => u.email === email && u.role === role);
    if (!found) return null;
    return { email, role: role as Role, name };
  } catch {
    return null;
  }
}

export function validateCredentials(email: string, password: string): AuthUser | null {
  if (password !== "checkbliss") return null;
  return AUTH_USERS.find((u) => u.email === email.toLowerCase()) || null;
}

export function createSessionToken(user: AuthUser): string {
  return encodeSession(user);
}

export function parseSessionToken(token: string): AuthUser | null {
  return decodeSession(token);
}

export { COOKIE_NAME };
