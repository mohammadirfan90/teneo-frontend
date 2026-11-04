"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, ArrowRight } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"
import type { BuildingView } from "@/features/owner/types"
import { BuildingFields } from "../fields"
import { applyApiErrors } from "../form-errors"
import {
  buildingSchema,
  buildingToValues,
  suggestedBuilding,
  toBuildingPayload,
  type BuildingValues,
} from "../schemas"
import { useStructure } from "../structure-store"
import { useWizard } from "../wizard-store"
import { StepShell } from "./step-shell"

export function StepBuilding() {
  const property = useWizard((s) => s.property)!
  const building = useWizard((s) => s.building)
  const setBuilding = useWizard((s) => s.setBuilding)
  const goTo = useWizard((s) => s.goTo)
  const remember = useStructure((s) => s.rememberBuilding)
  const [formError, setFormError] = useState<string | null>(null)
  const single = property.propertyType !== "BUILDING"

  const form = useForm<BuildingValues>({
    resolver: zodResolver(buildingSchema),
    defaultValues: building
      ? buildingToValues(building)
      : suggestedBuilding(property.propertyType, property.title),
    mode: "onTouched",
  })
  // Read during render so react-hook-form tracks it (formState is a lazy proxy).
  const { isDirty } = form.formState

  const submit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      let saved = building
      if (!building) {
        saved = await apiClient.post<BuildingView>(
          `/properties/${property.id}/buildings`,
          toBuildingPayload(values, "create")
        )
      } else if (isDirty) {
        saved = await apiClient.patch<BuildingView>(
          `/buildings/${building.id}`,
          toBuildingPayload(values, "patch")
        )
      }
      if (saved) {
        setBuilding(saved)
        remember(property.id, saved)
      }
      goTo(2)
    } catch (e) {
      setFormError(applyApiErrors(form, e))
    }
  })

  return (
    <form onSubmit={submit} noValidate>
      <StepShell
        title="Building"
        description={
          single
            ? "Teneo organises every listing as building, then flat, then room — so a house or a single flat still gets one building. We've filled in a sensible default."
            : "Name the building tenants will live in. You can add more buildings from the property page later."
        }
        onBack={() => goTo(0)}
        primary={
          <Button type="submit" loading={form.formState.isSubmitting}>
            {building ? "Save and continue" : "Add building and continue"} <ArrowRight />
          </Button>
        }
      >
        {formError && (
          <Alert variant="destructive" className="mb-5">
            <AlertCircle />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <BuildingFields control={form.control} />
      </StepShell>
    </form>
  )
}
