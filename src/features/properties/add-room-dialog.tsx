"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, ArrowRight, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { cn } from "cn"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FieldLegend, FieldSet } from "@/components/ui/field"
import { apiClient } from "@/lib/api/client"
import type { BuildingView, FlatView } from "@/features/owner/types"
import type { RoomView } from "@/types/domain"
import type { KnownFlat } from "./data"
import { BuildingFields, FlatFields } from "./fields"
import { applyApiErrors } from "./form-errors"
import { flatLabelInline } from "./format"
import { RoomForm } from "./room-form"
import {
  buildingSchema,
  flatSchema,
  suggestedBuilding,
  toBuildingPayload,
  toFlatPayload,
  toRoomPayload,
  type BuildingValues,
  type FlatValues,
} from "./schemas"
import { useStructure } from "./structure-store"

const NEW_BUILDING = "__new"

/**
 * Adds a room to an existing property: pick a flat we know about, or create a new
 * flat (in a known or new building) first. Each record is created as soon as the
 * owner moves on, so a failure later never duplicates earlier records.
 */
export function AddRoomDialog({
  propertyId,
  propertyTitle,
  propertyType,
  knownFlats,
}: {
  propertyId: string
  propertyTitle: string
  propertyType: string
  knownFlats: KnownFlat[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [flatId, setFlatId] = useState<string | null>(null)
  const [stage, setStage] = useState<"where" | "room">("where")
  const [buildingId, setBuildingId] = useState<string>(NEW_BUILDING)
  const [error, setError] = useState<string | null>(null)
  const localBuildings = useStructure((s) => s.buildings[propertyId]) ?? []
  const localFlats = useStructure((s) => s.flats[propertyId]) ?? []
  const { rememberBuilding, rememberFlat, rememberRoom } = useStructure()

  const flats = [
    ...knownFlats.map((f) => ({ id: f.id, label: `${f.buildingName} · ${flatLabelInline(f)}` })),
    ...localFlats
      .filter((f) => !knownFlats.some((k) => k.id === f.id))
      .map((f) => {
        const b = localBuildings.find((x) => x.id === f.buildingId)
        return { id: f.id, label: `${b ? `${b.name} · ` : ""}${flatLabelInline(f)}` }
      }),
  ]
  const [choice, setChoice] = useState<string>(flats[0]?.id ?? NEW_BUILDING)

  const type = propertyType === "VILLA" || propertyType === "STANDALONE_FLAT" ? propertyType : "BUILDING"
  const buildingForm = useForm<BuildingValues>({
    resolver: zodResolver(buildingSchema),
    defaultValues: localBuildings.length ? { name: "", floors: "" } : suggestedBuilding(type, propertyTitle),
    mode: "onTouched",
  })
  const flatForm = useForm<FlatValues>({
    resolver: zodResolver(flatSchema),
    defaultValues: { floor: "", doorNumber: "" },
    mode: "onTouched",
  })
  const [working, setWorking] = useState(false)

  const close = () => {
    setOpen(false)
    setStage("where")
    setFlatId(null)
    setError(null)
  }

  const continueToRoom = async () => {
    setError(null)
    if (choice !== NEW_BUILDING) {
      setFlatId(choice)
      setStage("room")
      return
    }
    const newBuilding = buildingId === NEW_BUILDING
    const valid = await Promise.all([newBuilding ? buildingForm.trigger() : true, flatForm.trigger()])
    if (valid.includes(false)) return
    setWorking(true)
    let bid = buildingId
    try {
      if (newBuilding) {
        const b = await apiClient.post<BuildingView>(
          `/properties/${propertyId}/buildings`,
          toBuildingPayload(buildingForm.getValues(), "create")
        )
        rememberBuilding(propertyId, b)
        setBuildingId(b.id)
        bid = b.id
      }
    } catch (e) {
      setWorking(false)
      return setError(applyApiErrors(buildingForm, e))
    }
    try {
      const flat = await apiClient.post<FlatView>(
        `/buildings/${bid}/flats`,
        toFlatPayload(flatForm.getValues())
      )
      rememberFlat(propertyId, flat)
      setChoice(flat.id)
      setFlatId(flat.id)
      setStage("room")
    } catch (e) {
      setError(applyApiErrors(flatForm, e))
    } finally {
      setWorking(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogTrigger asChild>
        <Button variant="outline" className="self-start sm:self-auto">
          <Plus /> Add a room
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{stage === "where" ? "Where is the room?" : "Room details"}</DialogTitle>
          <DialogDescription>
            {stage === "where"
              ? "Rooms belong to a flat inside a building. Choose a flat, or add a new one."
              : "The room is created as a draft. Publish it from its card when you're ready."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {stage === "where" ? (
          <div className="flex flex-col gap-5">
            <FieldSet>
              <FieldLegend variant="label">Flat</FieldLegend>
              <div role="radiogroup" className="grid gap-2">
                {[...flats, { id: NEW_BUILDING, label: "A new flat" }].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    role="radio"
                    aria-checked={choice === f.id}
                    onClick={() => setChoice(f.id)}
                    className={cn(
                      "rounded-lg border bg-card px-3 py-2.5 text-left text-sm transition-colors duration-150 hover:border-input focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
                      choice === f.id && "border-primary bg-primary/[0.04] ring-1 ring-primary"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {flats.length === 0 && (
                <p className="text-[0.8125rem] text-muted-foreground">
                  The API doesn&apos;t list a property&apos;s flats, so only flats that are live in search or
                  were created in this browser can be chosen.
                </p>
              )}
            </FieldSet>

            {choice === NEW_BUILDING && (
              <div className="flex flex-col gap-5 rounded-lg border p-4">
                {localBuildings.length > 0 && (
                  <FieldSet>
                    <FieldLegend variant="label">Building</FieldLegend>
                    <div role="radiogroup" className="flex flex-wrap gap-2">
                      {[
                        ...localBuildings.map((b) => ({ id: b.id, label: b.name })),
                        { id: NEW_BUILDING, label: "New building" },
                      ].map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          role="radio"
                          aria-checked={buildingId === b.id}
                          onClick={() => setBuildingId(b.id)}
                          className={cn(
                            "h-9 rounded-full border px-3 text-sm transition-colors duration-150 hover:border-input focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
                            buildingId === b.id ? "border-primary bg-primary/[0.06] text-primary" : "bg-card"
                          )}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </FieldSet>
                )}
                {buildingId === NEW_BUILDING && <BuildingFields control={buildingForm.control} />}
                <FlatFields control={flatForm.control} />
              </div>
            )}

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button type="button" loading={working} onClick={continueToRoom}>
                Continue <ArrowRight />
              </Button>
            </div>
          </div>
        ) : (
          <RoomForm
            id="add-room"
            submitLabel="Add room"
            onCancel={close}
            onSubmit={async (values) => {
              const room = await apiClient.post<RoomView>(
                `/flats/${flatId}/rooms`,
                toRoomPayload(values, "create")
              )
              rememberRoom(propertyId, room.id)
              toast.success(`${room.label} added as a draft`)
              close()
              router.refresh()
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
