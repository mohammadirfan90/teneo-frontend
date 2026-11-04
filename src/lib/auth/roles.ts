import type { Role } from "@/types/api"

export const ROLE_HOME: Record<Role, string> = {
  TENANT: "/dashboard",
  OWNER: "/owner",
  ADMIN: "/admin",
}

export const ROLE_LABEL: Record<Role, string> = {
  TENANT: "Tenant",
  OWNER: "Owner",
  ADMIN: "Admin",
}

/** Route prefix → role allowed to open it. Checked by proxy.ts and role layouts. */
export const PROTECTED_PREFIXES: ReadonlyArray<{ prefix: string; role: Role }> = [
  { prefix: "/dashboard", role: "TENANT" },
  { prefix: "/owner", role: "OWNER" },
  { prefix: "/admin", role: "ADMIN" },
]

/** Pages any signed-in user may open regardless of role. */
export const SIGNED_IN_PREFIXES = ["/account", "/payment"] as const

export function homeFor(role: Role | null): string {
  return role ? ROLE_HOME[role] : "/account"
}

export function requiredRoleFor(pathname: string): Role | null {
  const match = PROTECTED_PREFIXES.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
  return match?.role ?? null
}

/** Only allow same-origin relative redirects. */
export function safeNext(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback
  return next
}
