"use client"

import { useMutation } from "@tanstack/react-query"
import { Ban, RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { ReasonDialog } from "@/components/shared/reason-dialog"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import type { TakedownResult } from "./types"

function describe(e: unknown, verb: string): string {
  if (!isApiError(e)) return "Couldn't reach the server. Try again."
  if (e.status === 409)
    return `This listing can't be ${verb} from its current state. Refresh to see the latest.`
  if (e.status === 404) return "This property no longer exists."
  return e.userMessage
}

export function TakedownListing({ propertyId, title }: { propertyId: string; title: string }) {
  const router = useRouter()
  const takedown = useMutation({
    meta: { silent: true },
    mutationFn: (reason: string) =>
      apiClient.post<TakedownResult>(`/admin/listings/${propertyId}/takedown`, { reason }),
    onSuccess: (r) => {
      const effects = [
        r.rejectedApplications &&
          `${r.rejectedApplications} application${r.rejectedApplications === 1 ? "" : "s"} rejected`,
        r.cancelledViewings &&
          `${r.cancelledViewings} viewing${r.cancelledViewings === 1 ? "" : "s"} cancelled`,
      ].filter(Boolean)
      toast.success("Listing taken down", {
        description: effects.length ? effects.join(", ") : "No open applications or viewings were affected.",
      })
      router.refresh()
    },
  })

  return (
    <ReasonDialog
      trigger={
        <Button size="sm" variant="destructive-soft">
          <Ban /> Take down
        </Button>
      }
      title={`Take down “${title}”?`}
      description="All its rooms leave search at once. Open applications are rejected and pending viewings cancelled; active leases are not touched. You can reinstate it later."
      confirmLabel="Take down"
      destructive
      reason={{
        label: "Reason",
        max: 500,
        placeholder: "Photos don't match the address; reported by two tenants.",
        description: "Kept in the audit trail.",
      }}
      onConfirm={(reason) => takedown.mutateAsync(reason)}
      describeError={(e) => describe(e, "taken down")}
    />
  )
}

export function ReinstateListing({ propertyId }: { propertyId: string }) {
  const router = useRouter()
  const reinstate = useMutation({
    meta: { silent: true },
    mutationFn: () =>
      apiClient.post<{ id: string; status: string }>(`/admin/listings/${propertyId}/reinstate`, {}),
    onSuccess: () => {
      toast.success("Listing reinstated", {
        description: "It's published again. Search results catch up within about two minutes.",
      })
      router.refresh()
    },
  })

  return (
    <ReasonDialog
      trigger={
        <Button size="sm" variant="outline">
          <RotateCcw /> Reinstate
        </Button>
      }
      title="Reinstate this listing?"
      description="The property goes back to published. Applications and viewings closed by the takedown stay closed."
      confirmLabel="Reinstate"
      reason={null}
      onConfirm={() => reinstate.mutateAsync()}
      describeError={(e) => describe(e, "reinstated")}
    />
  )
}
