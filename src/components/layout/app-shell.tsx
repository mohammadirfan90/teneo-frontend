import { Suspense, type ReactNode } from "react"

import { Logo } from "@/components/shared/logo"
import { ROLE_HOME, ROLE_LABEL } from "@/lib/auth/roles"
import type { Role } from "@/types/api"
import { MobileNav } from "./mobile-nav"
import { SidebarNav } from "./nav-links"
import { SessionActions, SessionActionsFallback } from "./session-actions"
import { ThemeToggle } from "./theme-toggle"

/**
 * Workspace chrome for a role. Everything here except the session menu is static,
 * so it renders in the prerendered shell; the session part streams in.
 */
export function AppShell({ role, children }: { role: Role; children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-1">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r bg-sidebar lg:flex">
        <div className="flex h-16 items-center px-5">
          <Logo href={ROLE_HOME[role]} />
        </div>
        <p className="px-5 pb-3 text-xs text-subtle">{ROLE_LABEL[role]} workspace</p>
        <div className="flex-1 overflow-y-auto px-3 pb-6">
          <Suspense>
            <SidebarNav role={role} />
          </Suspense>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-6">
          <div className="flex items-center gap-1 lg:hidden">
            <Suspense>
              <MobileNav role={role} title={`${ROLE_LABEL[role]} workspace`} />
            </Suspense>
            <Logo href={ROLE_HOME[role]} className="ml-1" />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Suspense fallback={<SessionActionsFallback />}>
              <SessionActions />
            </Suspense>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
