"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, ArrowRight, DoorOpen, Plus } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"
import type { FlatView } from "@/features/owner/types"
import { FlatFields } from "../fields"
import { applyApiErrors } from "../form-errors"
import { flatLabel } from "../format"
import { flatSchema, toFlatPayload, type FlatValues } from "../schemas"
import { useStructure } from "../structure-store"
import { useWizard } from "../wizard-store"
import { StepShell } from "./step-shell"

export function StepFlats() {
  const property = useWizard((s) => s.property)!
  const building = useWizard((s) => s.building)!
  const flats = useWizard((s) => s.flats)
  const addFlat = useWizard((s) => s.addFlat)
  const goTo = useWizard((s) => s.goTo)
  const remember = useStructure((s) => s.rememberFlat)
  const [formError, setFormError] = useState<string | null>(null)
  const [adding, setAdding] = useState(flats.length === 0)

  const defaults: FlatValues =
    property.propertyType === "BUILDING" ? { floor: "", doorNumber: "" } : { floor: "0", doorNumber: "" }
  const form = useForm<FlatValues>({
    resolver: zodResolver(flatSchema),
    defaultValues: defaults,
    mode: "onTouched",
  })

  const submit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      const flat = await apiClient.post<FlatView>(`/buildings/${building.id}/flats`, toFlatPayload(values))
      addFlat(flat)
      remember(property.id, flat)
      toast.success(`${flatLabel(flat)} added`)
      form.reset(defaults)
      setAdding(false)
    } catch (e) {
      setFormError(applyApiErrors(form, e))
    }
  })

  return (
    <StepShell
      title="Flats"
      description={`Add the flats in ${building.name} that have rooms to let. Flats can't be edited once added (the API has no edit for them), so double-check the floor and door number.`}
      onBack={() => goTo(1)}
      primary={
        <Button type="button" disabled={flats.length === 0 || adding} onClick={() => goTo(3)}>
          Continue to rooms <ArrowRight />
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {flats.length > 0 && (
          <ul className="grid gap-2 sm:grid-cols-2" aria-label="Flats added">
            {flats.map((f) => (
              <li
                key={f.id}
                className="flex items-center gap-3 rounded-lg border bg-surface-2/40 px-3 py-2.5"
              >
                <DoorOpen className="size-4 text-subtle" aria-hidden />
                <span className="text-sm font-medium">{flatLabel(f)}</span>
              </li>
            ))}
          </ul>
        )}

        {adding ? (
          <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-lg border p-4">
            <h3 className="text-sm font-medium">{flats.length ? "Another flat" : "First flat"}</h3>
            {formError && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <FlatFields control={form.control} />
            <div className="flex justify-end gap-2">
              {flats.length > 0 && (
                <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
              )}
              <Button type="submit" loading={form.formState.isSubmitting}>
                Add flat
              </Button>
            </div>
          </form>
        ) : (
          <Button type="button" variant="outline" className="self-start" onClick={() => setAdding(true)}>
            <Plus /> Add another flat
          </Button>
        )}
      </div>
    </StepShell>
  )
}
