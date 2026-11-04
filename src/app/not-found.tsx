import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Search } from "lucide-react"

import { Logo } from "@/components/shared/logo"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Page not found",
}

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6">
        <Logo />
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 pb-24">
        <p className="font-mono text-sm text-subtle">404</p>
        <h1 className="mt-2 text-3xl font-semibold">We couldn&apos;t find that page</h1>
        <p className="mt-3 text-muted-foreground">
          The link may be old, or the listing was taken down. Rooms that are still available are in search.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/rooms">
              <Search /> Browse rooms
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/">
              <ArrowLeft /> Back to home
            </Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
