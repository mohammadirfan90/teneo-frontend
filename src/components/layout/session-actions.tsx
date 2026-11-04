import Link from "next/link"

import { Button } from "@/components/ui/button"
import { getSessionHint } from "@/lib/api/server"
import { UserMenu } from "./user-menu"

/** Session-dependent header actions. Reads cookies, so render inside <Suspense>. */
export async function SessionActions() {
  const session = await getSessionHint()
  if (session) return <UserMenu email={session.email} role={session.role} />
  return (
    <div className="flex items-center gap-1.5">
      <Button variant="ghost" asChild className="hidden sm:inline-flex">
        <Link href="/login">Sign in</Link>
      </Button>
      <Button asChild>
        <Link href="/register">Create account</Link>
      </Button>
    </div>
  )
}

export function SessionActionsFallback() {
  return <div className="h-9 w-40" aria-hidden />
}
