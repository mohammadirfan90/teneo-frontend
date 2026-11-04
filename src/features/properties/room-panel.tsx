"use client"

import { useMutation } from "@tanstack/react-query"
import { BedDouble, ChevronDown, Pencil } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { cn } from "cn"

import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import { formatDate, formatMoney } from "@/lib/format"
import { ROOM_ACTION_LABEL, ROOM_OWNER_NEXT } from "@/features/owner/labels"
import { ROOM_TYPE_LABEL, leaseRange } from "@/features/rooms/labels"
import type { RoomStatus, RoomView } from "@/types/domain"
import { PhotoManager } from "./photo-manager"
import { RoomForm } from "./room-form"
import { roomToValues, toRoomPayload } from "./schemas"

const STATUS_NOTE: Partial<Record<RoomStatus, string>> = {
  DRAFT: "Not visible to tenants yet.",
  RESERVED: "Held for an approved applicant until the lease starts.",
  OCCUPIED: "A tenant lives here. It moves to a check when the lease ends.",
  MAINTENANCE_CHECK: "The last lease ended. Relist it once the room has been checked.",
  MAINTENANCE: "Hidden from search while you fix things.",
  TAKEN_DOWN: "Removed by Teneo moderation.",
}

function transitionError(e: unknown): string {
  if (!isApiError(e)) return "Couldn't change the room status."
  if (e.code === "KYC_REQUIRED")
    return "Your identity verification must be approved before you can publish rooms."
  if (e.status === 409) return "The room changed in the meantime. Refresh and try again."
  return e.userMessage
}

/** One room on the property page: summary, edit, owner status moves and photos. */
export function RoomPanel({
  room: initial,
  flatName,
  propertyPublished,
  kycApproved,
  localOnly,
}: {
  room: RoomView
  flatName?: string
  propertyPublished: boolean
  kycApproved: boolean
  /** Known only from this browser (draft rooms can't be listed by the API). */
  localOnly?: boolean
}) {
  const router = useRouter()
  const [room, setRoom] = useState(initial)
  const [editOpen, setEditOpen] = useState(false)
  const [photosOpen, setPhotosOpen] = useState(false)
  const [photoCount, setPhotoCount] = useState<number | null>(null)

  const move = useMutation({
    meta: { silent: true },
    mutationFn: (to: RoomStatus) =>
      room.status === "DRAFT" && to === "PUBLISHED"
        ? apiClient.post<RoomView>(`/rooms/${room.id}/publish`)
        : apiClient.post<RoomView>(`/rooms/${room.id}/transition`, { to, expectedVersion: room.version }),
    onSuccess: (r) => {
      setRoom(r)
      toast.success(`${r.label} is now ${r.status.toLowerCase().replace(/_/g, " ")}`)
      router.refresh()
    },
    onError: (e) => toast.error(transitionError(e)),
  })

  const next = room.status === "DRAFT" && !kycApproved ? [] : (ROOM_OWNER_NEXT[room.status] ?? [])
  const lease = leaseRange(room.minLeaseMonths, room.maxLeaseMonths)
  const note =
    room.status === "DRAFT" && !propertyPublished
      ? "Draft. Publishing the property puts all of its draft rooms live at once."
      : STATUS_NOTE[room.status]

  return (
    <li className="rounded-xl border bg-card">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <BedDouble className="mt-0.5 size-4 shrink-0 text-subtle" aria-hidden />
          <div className="min-w-0">
            <p className="font-medium">{room.label}</p>
            <p className="text-[0.8125rem] text-muted-foreground">
              {ROOM_TYPE_LABEL[room.roomType]}
              {flatName ? ` · ${flatName}` : ""}
              {lease ? ` · ${lease}` : ""}
              {room.availableFrom ? ` · from ${formatDate(room.availableFrom)}` : ""}
            </p>
            <p className="mt-1 text-sm tabular-nums">
              {formatMoney(room.baseRentMinor, room.currency)}
              <span className="text-muted-foreground">
                /month · deposit {formatMoney(room.depositMinor, room.currency)}
                {room.billsIncluded ? " · bills included" : ""}
              </span>
            </p>
            {(note || localOnly) && (
              <p className="mt-1 text-[0.8125rem] text-muted-foreground">
                {note}
                {localOnly ? " Listed here because it was created in this browser." : ""}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start">
          <StatusBadge status={room.status} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t px-4 py-2.5">
        <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil /> Edit
        </Button>
        {next.map((to) => (
          <Button
            key={to}
            variant="outline"
            size="sm"
            loading={move.isPending && move.variables === to}
            disabled={move.isPending}
            onClick={() => move.mutate(to)}
          >
            {ROOM_ACTION_LABEL[`${room.status}>${to}`] ?? to}
          </Button>
        ))}
        {room.status === "DRAFT" && !kycApproved && (
          <span className="text-[0.8125rem] text-muted-foreground">
            Publishing needs approved verification
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          aria-expanded={photosOpen}
          aria-controls={`photos-${room.id}`}
          onClick={() => setPhotosOpen((o) => !o)}
        >
          Photos{photoCount !== null ? ` (${photoCount})` : ""}
          <ChevronDown className={cn("transition-transform duration-150", photosOpen && "rotate-180")} />
        </Button>
      </div>
      {photosOpen && (
        <div id={`photos-${room.id}`} className="border-t p-4">
          <PhotoManager roomId={room.id} roomLabel={room.label} onCountChange={setPhotoCount} />
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit {room.label}</DialogTitle>
            <DialogDescription>Changes apply to the live listing straight away.</DialogDescription>
          </DialogHeader>
          <RoomForm
            id={`edit-${room.id}`}
            defaultValues={roomToValues(room)}
            currency={room.currency}
            submitLabel="Save changes"
            onCancel={() => setEditOpen(false)}
            onSubmit={async (values, dirty) => {
              if (dirty) {
                const saved = await apiClient.patch<RoomView>(
                  `/rooms/${room.id}`,
                  toRoomPayload(values, "patch", room.currency)
                )
                setRoom(saved)
                toast.success("Room updated")
                router.refresh()
              }
              setEditOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </li>
  )
}
