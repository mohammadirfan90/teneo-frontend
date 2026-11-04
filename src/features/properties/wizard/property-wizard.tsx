"use client"

import { Loader2, RotateCcw } from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useMounted } from "@/features/owner/local-records"
import { useWizard, type WizardStep } from "../wizard-store"
import { StepBuilding } from "./step-building"
import { StepDetails } from "./step-details"
import { StepFlats } from "./step-flats"
import { StepPhotos } from "./step-photos"
import { StepReview } from "./step-review"
import { StepRooms } from "./step-rooms"
import { WizardStepper } from "./stepper"

/** Highest step the saved records allow (guards a stale sessionStorage step). */
function maxAllowed(s: ReturnType<typeof useWizard.getState>): WizardStep {
  if (!s.property) return 0
  if (!s.building) return 1
  if (s.flats.length === 0) return 2
  if (s.rooms.length === 0) return 3
  return 5
}

export function PropertyWizard({ kycApproved }: { kycApproved: boolean }) {
  const mounted = useMounted()
  const state = useWizard()
  const { property, furthest, goTo, reset, leaving, setLeaving } = state
  const step = Math.min(state.step, maxAllowed(state)) as WizardStep

  useEffect(() => {
    setLeaving(false)
  }, [setLeaving])

  if (!mounted) return <WizardSkeleton />
  if (leaving)
    return (
      <div className="flex items-center gap-2 rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden /> Opening your property…
      </div>
    )

  return (
    <div className="flex flex-col gap-6">
      {property && (
        <div className="flex flex-col gap-2 rounded-lg bg-surface-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            Continuing <span className="font-medium">{property.title}</span>, saved as a draft.{" "}
            <Link href={`/owner/properties/${property.id}`} className="underline underline-offset-4">
              Open property
            </Link>
          </p>
          <Button variant="ghost" size="sm" className="self-start sm:self-auto" onClick={reset}>
            <RotateCcw /> Start another property
          </Button>
        </div>
      )}

      <WizardStepper step={step} furthest={Math.max(furthest, step) as WizardStep} onSelect={goTo} />

      {step === 0 && <StepDetails key={property?.id ?? "new"} />}
      {step === 1 && <StepBuilding />}
      {step === 2 && <StepFlats />}
      {step === 3 && <StepRooms />}
      {step === 4 && <StepPhotos />}
      {step === 5 && <StepReview kycApproved={kycApproved} />}
    </div>
  )
}

export function WizardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Loading">
      <div className="hidden gap-2 md:grid md:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
      <Skeleton className="h-10 md:hidden" />
      <Skeleton className="h-[480px] rounded-xl" />
    </div>
  )
}
