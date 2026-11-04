import { redirect } from "next/navigation"

import { getSessionHint } from "@/lib/api/server"
import { homeFor } from "@/lib/auth/roles"
import type { Role } from "@/types/api"

/**
 * Defense in depth behind proxy.ts: renders nothing, redirects on mismatch.
 * Reads cookies, so it must sit inside <Suspense>.
 */
export async function RoleGate({ role }: { role: Role }) {
  const session = await getSessionHint()
  if (!session) redirect("/login")
  if (session.role !== role) redirect(homeFor(session.role))
  return null
}
