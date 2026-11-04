"use client"

import { ArrowRight, BedDouble, Pencil, Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"
import { formatMoney } from "@/lib/format"
import { ROOM_TYPE_LABEL } from "@/features/rooms/labels"
import type { RoomView } from "@/types/domain"
import { flatLabel, flatLabelInline } from "../format"
import { RoomForm } from "../room-form"
import { roomToValues, toRoomPayload } from "../schemas"
import { useStructure } from "../structure-store"
import { useWizard } from "../wizard-store"
import { StepShell } from "./step-shell"

type Editing = { flatId: string; roomId?: string } | null

export function StepRooms() {
  const property = useWizard((s) => s.property)!
  const flats = useWizard((s) => s.flats)
  const rooms = useWizard((s) => s.rooms)
  const upsertRoom = useWizard((s) => s.upsertRoom)
  const goTo = useWizard((s) => s.goTo)
  const remember = useStructure((s) => s.rememberRoom)
  const [editing, setEditing] = useState<Editing>(
    rooms.length === 0 && flats[0] ? { flatId: flats[0].id } : null
  )

  return (
    <StepShell
      title="Rooms"
      description="Add each room you want to let, with its rent and lease terms. Rent is entered in taka per month."
      onBack={() => goTo(2)}
      primary={
        <Button type="button" disabled={rooms.length === 0 || editing !== null} onClick={() => goTo(4)}>
          Continue to photos <ArrowRight />
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        {flats.map((flat) => {
          const flatRooms = rooms.filter((r) => r.flatId === flat.id)
          const addingHere = editing?.flatId === flat.id && !editing.roomId
          return (
            <section key={flat.id} aria-labelledby={`flat-${flat.id}`} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h3 id={`flat-${flat.id}`} className="font-medium">
                  {flatLabel(flat)}
                </h3>
                {!addingHere && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={editing !== null}
                    onClick={() => setEditing({ flatId: flat.id })}
                  >
                    <Plus /> Add room
                  </Button>
                )}
              </div>

              {flatRooms.length === 0 && !addingHere && (
                <p className="text-sm text-muted-foreground">No rooms in this flat yet.</p>
              )}

              <ul className="flex flex-col gap-2">
                {flatRooms.map((room) =>
                  editing?.roomId === room.id ? (
                    <li key={room.id} className="rounded-lg border p-4">
                      <RoomForm
                        id={`room-${room.id}`}
                        defaultValues={roomToValues(room)}
                        currency={room.currency}
                        submitLabel="Save room"
                        onCancel={() => setEditing(null)}
                        onSubmit={async (values, dirty) => {
                          if (dirty) {
                            const saved = await apiClient.patch<RoomView>(
                              `/rooms/${room.id}`,
                              toRoomPayload(values, "patch", room.currency)
                            )
                            upsertRoom(saved)
                            toast.success(`${saved.label} updated`)
                          }
                          setEditing(null)
                        }}
                      />
                    </li>
                  ) : (
                    <li
                      key={room.id}
                      className="flex flex-col gap-2 rounded-lg border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <BedDouble className="mt-0.5 size-4 shrink-0 text-subtle" aria-hidden />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{room.label}</p>
                          <p className="text-[0.8125rem] text-muted-foreground tabular-nums">
                            {ROOM_TYPE_LABEL[room.roomType]} ·{" "}
                            {formatMoney(room.baseRentMinor, room.currency)}
                            /month · deposit {formatMoney(room.depositMinor, room.currency)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <StatusBadge status={room.status} />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={editing !== null}
                          onClick={() => setEditing({ flatId: flat.id, roomId: room.id })}
                        >
                          <Pencil /> Edit
                        </Button>
                      </div>
                    </li>
                  )
                )}
              </ul>

              {addingHere && (
                <div className="rounded-lg border p-4">
                  <h4 className="mb-4 text-sm font-medium">New room in {flatLabelInline(flat)}</h4>
                  <RoomForm
                    id={`new-room-${flat.id}`}
                    submitLabel="Add room"
                    onCancel={rooms.length ? () => setEditing(null) : undefined}
                    onSubmit={async (values) => {
                      const room = await apiClient.post<RoomView>(
                        `/flats/${flat.id}/rooms`,
                        toRoomPayload(values, "create")
                      )
                      upsertRoom(room)
                      remember(property.id, room.id)
                      toast.success(`${room.label} added as a draft`)
                      setEditing(null)
                    }}
                  />
                </div>
              )}
            </section>
          )
        })}
      </div>
    </StepShell>
  )
}
