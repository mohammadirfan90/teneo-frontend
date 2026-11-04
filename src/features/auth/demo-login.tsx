"use client"

import { Building2, KeyRound, ShieldCheck, type LucideIcon } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { demoLoginAction } from "./actions"
import type { DemoRole } from "./schemas"

const DEMOS: Array<{ role: DemoRole; title: string; body: string; icon: LucideIcon }> = [
  {
    role: "admin",
    title: "Admin",
    body: "Review KYC, moderate listings, read the audit log.",
    icon: ShieldCheck,
  },
  {
    role: "tenant",
    title: "Tenant",
    body: "Search rooms, apply, sign the lease and pay rent.",
    icon: KeyRound,
  },
  {
    role: "owner",
    title: "Owner",
    body: "List rooms, screen applicants, bill tenants, fix issues.",
    icon: Building2,
  },
]

export function DemoLogin() {
  const [pending, startTransition] = useTransition()
  const [active, setActive] = useState<DemoRole | null>(null)

  const signInAs = (role: DemoRole) => {
    setActive(role)
    startTransition(async () => {
      const result = await demoLoginAction(role)
      if (result) {
        toast.error(result.message)
        setActive(null)
      }
    })
  }

  return (
    <section aria-labelledby="demo-heading">
      <h2 id="demo-heading" className="text-sm font-medium">
        Quick demo login
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">One click signs you in with a seeded account.</p>
      <ul className="mt-4 divide-y rounded-xl border bg-card">
        {DEMOS.map(({ role, title, body, icon: Icon }) => (
          <li key={role} className="flex items-center gap-3 p-3 sm:p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-primary">
              <Icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{title}</p>
              <p className="text-[0.8125rem] text-muted-foreground">{body}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => signInAs(role)}
              loading={pending && active === role}
              disabled={pending && active !== role}
              aria-label={`Demo login as ${title}`}
            >
              Demo login
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
