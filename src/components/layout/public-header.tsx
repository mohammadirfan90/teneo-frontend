import { Suspense } from "react"

import { Logo } from "@/components/shared/logo"
import { MobileNav } from "./mobile-nav"
import { PublicNavLinks } from "./nav-links"
import { SessionActions, SessionActionsFallback } from "./session-actions"

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-1 md:hidden">
          <Suspense>
            <MobileNav title="Teneo" />
          </Suspense>
        </div>
        <Logo />
        <nav aria-label="Main" className="ml-6 hidden md:block">
          <Suspense>
            <PublicNavLinks />
          </Suspense>
        </nav>
        <div className="ml-auto">
          <Suspense fallback={<SessionActionsFallback />}>
            <SessionActions />
          </Suspense>
        </div>
      </div>
    </header>
  )
}
