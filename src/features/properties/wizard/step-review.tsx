"use client"

import { useMutation } from "@tanstack/react-query"
import { AlertCircle, Pencil, Rocket } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type ReactNode } from "react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import { formatMoney } from "@/lib/format"
import type { PublishPropertyResult } from "@/features/owner/types"
import { PROPERTY_TYPE_LABEL, ROOM_TYPE_LABEL, leaseRange } from "@/features/rooms/labels"
import { flatLabel } from "../format"
import { useWizard, type WizardStep } from "../wizard-store"
import { StepShell } from "./step-shell"

function Section({ title, step, children }: { title: string; step: WizardStep; children: ReactNode }) {
  const goTo = useWizard((s) => s.goTo)
  return (
    <section className="flex flex-col gap-3 border-b pb-5 last:border-b-0 last:pb-0">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium">{title}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={() => goTo(step)}>
          <Pencil /> Edit
        </Button>
      </div>
      {children}
    </section>
  )
}

export function StepReview({ kycApproved }: { kycApproved: boolean }) {
  const router = useRouter()
  const { property, building, flats, rooms, photoCounts, complete, goTo } = useWizard()
  const [blocker, setBlocker] = useState<string | null>(null)
  const p = property!

  const finish = (message: string, description?: string) => {
    toast.success(message, description ? { description } : undefined)
    complete()
    router.push(`/owner/properties/${p.id}`)
    router.refresh()
  }

  const publish = useMutation({
    meta: { silent: true },
    mutationFn: () => apiClient.post<PublishPropertyResult>(`/properties/${p.id}/publish`),
    onSuccess: (r) =>
      finish(
        "Property published",
        r.roomsPublished === 1
          ? "1 room is now live in search."
          : `${r.roomsPublished} rooms are now live in search.`
      ),
    onError: (e) => {
      if (isApiError(e) && e.code === "KYC_REQUIRED")
        return setBlocker(
          "Your identity verification must be approved before you can publish. Save as a draft for now."
        )
      if (isApiError(e) && e.status === 409) return setBlocker("This property has already been published.")
      setBlocker(isApiError(e) ? e.userMessage : "Couldn't publish. Try again.")
    },
  })

  const withoutPhotos = rooms.filter((r) => !photoCounts[r.id]).length

  return (
    <StepShell
      title="Review and publish"
      description="Everything below is already saved as a draft. Publishing puts the property and all of its draft rooms into search."
      onBack={() => goTo(4)}
      aside={
        <Button
          type="button"
          variant="outline"
          disabled={publish.isPending}
          onClick={() =>
            finish("Saved as a draft", "Publish it from the property page whenever you're ready.")
          }
        >
          Save as draft
        </Button>
      }
      primary={
        <Button
          type="button"
          loading={publish.isPending}
          disabled={!kycApproved}
          onClick={() => publish.mutate()}
        >
          <Rocket /> Publish property
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        {!kycApproved && (
          <Alert>
            <AlertCircle />
            <AlertDescription>
              Publishing needs an approved identity verification.{" "}
              <Link href="/owner/profile" className="font-medium underline underline-offset-4">
                Check your verification
              </Link>
              . You can save this listing as a draft now.
            </AlertDescription>
          </Alert>
        )}
        {blocker && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{blocker}</AlertDescription>
          </Alert>
        )}

        <Section title="Property" step={0}>
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{p.title}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Kind</dt>
              <dd>{PROPERTY_TYPE_LABEL[p.propertyType]}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Address</dt>
              <dd>
                {[p.addressLine1, p.addressLine2, p.area, p.city, p.postalCode, p.countryCode]
                  .filter(Boolean)
                  .join(", ")}
              </dd>
            </div>
          </dl>
        </Section>

        <Section title="Building and flats" step={2}>
          <p className="text-sm">
            <span className="font-medium">{building?.name}</span>
            {building?.floors ? (
              <span className="text-muted-foreground"> · {building.floors} floors</span>
            ) : null}
          </p>
          <p className="text-sm text-muted-foreground">{flats.map(flatLabel).join(" · ")}</p>
        </Section>

        <Section title={rooms.length === 1 ? "1 room" : `${rooms.length} rooms`} step={3}>
          <ul className="divide-y rounded-lg border">
            {rooms.map((r) => {
              const lease = leaseRange(r.minLeaseMonths, r.maxLeaseMonths)
              const n = photoCounts[r.id] ?? 0
              return (
                <li
                  key={r.id}
                  className="flex flex-col gap-1 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.label}</p>
                    <p className="text-[0.8125rem] text-muted-foreground">
                      {ROOM_TYPE_LABEL[r.roomType]}
                      {lease ? ` · ${lease}` : ""} · {n === 1 ? "1 photo" : `${n} photos`}
                    </p>
                  </div>
                  <p className="text-sm tabular-nums sm:text-right">
                    {formatMoney(r.baseRentMinor, r.currency)}
                    <span className="text-muted-foreground">/month</span>
                  </p>
                </li>
              )
            })}
          </ul>
          {withoutPhotos > 0 && (
            <p className="text-[0.8125rem] text-muted-foreground">
              {withoutPhotos === 1 ? "1 room has" : `${withoutPhotos} rooms have`} no photos yet. You can
              still publish and add them later.
            </p>
          )}
        </Section>
      </div>
    </StepShell>
  )
}
