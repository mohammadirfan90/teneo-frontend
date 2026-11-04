import { LifeBuoy, UserRound } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { getMe } from "@/lib/api/server"
import { primaryRole } from "@/lib/auth/cookies"
import { homeFor } from "@/lib/auth/roles"

export const metadata: Metadata = { title: "Your account", robots: { index: false } }

async function AccountDetails() {
  const me = await getMe()
  const role = primaryRole(me.roles)
  if (role) redirect(homeFor(role))

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-surface-2 text-muted-foreground">
          <UserRound className="size-5" aria-hidden />
        </span>
        <div>
          <p className="font-medium">{me.email}</p>
          <p className="text-sm text-muted-foreground">Signed in · no tenant or owner role</p>
        </div>
      </div>
      <p className="mt-5 text-muted-foreground">
        This account was created without choosing how you&apos;ll use Teneo, so there&apos;s no workspace to
        open yet. Accounts created through sign-up pick tenant or owner at the start; for this one, contact us
        and we&apos;ll set it up.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/contact">
            <LifeBuoy /> Contact support
          </Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/rooms">Browse rooms</Link>
        </Button>
      </div>
    </div>
  )
}

export default function AccountPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-semibold">Your account</h1>
      <div className="mt-6">
        <Suspense fallback={<Skeleton className="h-56 rounded-xl" />}>
          <AccountDetails />
        </Suspense>
      </div>
    </main>
  )
}
