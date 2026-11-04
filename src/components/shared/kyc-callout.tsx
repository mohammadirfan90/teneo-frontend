import { ArrowRight, Clock, ShieldAlert, ShieldX } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import type { KycStatus } from "@/types/api"

const COPY: Record<
  Exclude<KycStatus, "APPROVED">,
  { icon: typeof Clock; title: string; body: string; cta?: string }
> = {
  NONE: {
    icon: ShieldAlert,
    title: "Verify your identity to get started",
    body: "Set up your profile and submit an ID. An admin reviews it, usually within a day.",
    cta: "Start verification",
  },
  PENDING: {
    icon: Clock,
    title: "Your verification is being reviewed",
    body: "You'll be able to continue as soon as an admin approves your documents.",
  },
  REJECTED: {
    icon: ShieldX,
    title: "Your verification needs another look",
    body: "Check the reviewer's notes, then submit updated documents.",
    cta: "Review and resubmit",
  },
}

/** Shown on overviews until KYC is approved. `action` describes what verification unlocks. */
export function KycCallout({ status, href, action }: { status: KycStatus; href: string; action: string }) {
  if (status === "APPROVED") return null
  const copy = COPY[status]
  const Icon = copy.icon
  return (
    <section
      aria-label="Identity verification"
      className="flex flex-col gap-4 rounded-xl border border-warning/25 bg-warning-soft p-4 sm:flex-row sm:items-center sm:p-5"
    >
      <Icon className="size-5 shrink-0 text-warning" aria-hidden />
      <div className="flex-1">
        <h2 className="font-medium">{copy.title}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {copy.body} Verification is required to {action}.
        </p>
      </div>
      {copy.cta && (
        <Button asChild variant="outline" className="shrink-0">
          <Link href={href}>
            {copy.cta} <ArrowRight />
          </Link>
        </Button>
      )}
    </section>
  )
}
