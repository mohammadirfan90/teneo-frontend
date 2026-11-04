"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { CalendarCheck, Check, Info } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import { formatDateTime } from "@/lib/format"
import type { ViewingView } from "@/types/domain"
import { useLocalRecords } from "../local-records"

/**
 * The latest viewing proposed from this browser for an application. There is no
 * list-viewings endpoint, so the id is only known from the create response.
 */
export function ViewingPanel({
  applicationId,
  viewing: saved,
}: {
  applicationId: string
  viewing: ViewingView
}) {
  const saveViewing = useLocalRecords((s) => s.saveViewing)
  const [reason, setReason] = useState("")

  // Refresh from the server in case the tenant cancelled in the meantime.
  const live = useQuery({
    queryKey: ["viewing", saved.id],
    queryFn: async () => {
      const v = await apiClient.get<ViewingView>(`/viewings/${saved.id}`)
      saveViewing(applicationId, v)
      return v
    },
    initialData: saved,
    staleTime: 0,
  })
  const viewing = live.data ?? saved

  const confirm = useMutation({
    meta: { silent: true },
    mutationFn: (slot: string) =>
      apiClient.post<ViewingView>(`/viewings/${viewing.id}/confirm`, { confirmedSlot: slot }),
    onSuccess: (v) => {
      saveViewing(applicationId, v)
      void live.refetch()
      toast.success("Viewing confirmed", { description: formatDateTime(v.confirmedSlot) })
    },
    onError: (e) =>
      toast.error(
        isApiError(e) && e.status === 409
          ? "This viewing can no longer be confirmed."
          : "Couldn't confirm the viewing."
      ),
  })

  const cancel = useMutation({
    meta: { silent: true },
    mutationFn: () =>
      apiClient.post<ViewingView>(
        `/viewings/${viewing.id}/cancel`,
        reason.trim() ? { reason: reason.trim() } : {}
      ),
    onSuccess: (v) => {
      saveViewing(applicationId, v)
      void live.refetch()
      toast.success("Viewing cancelled")
    },
    onError: (e) => toast.error(isApiError(e) ? e.userMessage : "Couldn't cancel the viewing."),
  })

  const open = viewing.status === "REQUESTED" || viewing.status === "CONFIRMED"

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <CalendarCheck className="size-4 text-subtle" aria-hidden /> Viewing
        </p>
        <StatusBadge status={viewing.status} />
      </div>

      {viewing.status === "CONFIRMED" && viewing.confirmedSlot ? (
        <p className="text-sm">
          Confirmed for{" "}
          <span className="font-medium tabular-nums">{formatDateTime(viewing.confirmedSlot)}</span>
        </p>
      ) : viewing.status === "REQUESTED" ? (
        <>
          <p className="text-[0.8125rem] text-muted-foreground">Confirm the time that suits you both.</p>
          <ul className="flex flex-col gap-1.5">
            {viewing.proposedSlots.map((slot) => (
              <li
                key={slot}
                className="flex items-center justify-between gap-2 rounded-md bg-surface-2/60 px-2.5 py-1.5"
              >
                <span className="text-sm tabular-nums">{formatDateTime(slot)}</span>
                <Button
                  size="xs"
                  variant="outline"
                  loading={confirm.isPending && confirm.variables === slot}
                  disabled={confirm.isPending}
                  onClick={() => confirm.mutate(slot)}
                >
                  <Check /> Confirm
                </Button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        viewing.reason && <p className="text-[0.8125rem] text-muted-foreground">Reason: {viewing.reason}</p>
      )}

      {open && (
        <ConfirmDialog
          trigger={
            <Button variant="ghost" size="sm" className="self-start">
              Cancel viewing
            </Button>
          }
          title="Cancel this viewing?"
          description="The tenant sees the viewing as cancelled. The application itself stays open."
          confirmLabel="Cancel viewing"
          destructive
          pending={cancel.isPending}
          onConfirm={() => cancel.mutateAsync()}
        >
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Reason (optional)</span>
            <Textarea value={reason} maxLength={500} rows={3} onChange={(e) => setReason(e.target.value)} />
          </label>
        </ConfirmDialog>
      )}
    </div>
  )
}

export function NoLocalViewingNote() {
  return (
    <p className="flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2.5 text-[0.8125rem] text-muted-foreground">
      <Info className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>
        A viewing was proposed for this application from another browser. Teneo&apos;s API can&apos;t list
        viewings (their id is only returned when they&apos;re created), so it can only be confirmed from where
        it was proposed. You can still shortlist or reject the applicant here.
      </span>
    </p>
  )
}
