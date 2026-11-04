"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, ArrowRight } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"
import type { PropertyView } from "@/types/domain"
import { PropertyFields } from "../fields"
import { applyApiErrors } from "../form-errors"
import {
  emptyProperty,
  propertySchema,
  propertyToValues,
  toPropertyPayload,
  type PropertyValues,
} from "../schemas"
import { useWizard } from "../wizard-store"
import { StepShell } from "./step-shell"

export function StepDetails() {
  const property = useWizard((s) => s.property)
  const setProperty = useWizard((s) => s.setProperty)
  const goTo = useWizard((s) => s.goTo)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<PropertyValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: property ? propertyToValues(property) : emptyProperty,
    mode: "onTouched",
  })
  // Read during render so react-hook-form tracks it (formState is a lazy proxy).
  const { isDirty } = form.formState

  const submit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      if (!property) {
        setProperty(await apiClient.post<PropertyView>("/properties", toPropertyPayload(values, "create")))
      } else if (isDirty) {
        setProperty(
          await apiClient.patch<PropertyView>(
            `/properties/${property.id}`,
            toPropertyPayload(values, "patch")
          )
        )
      }
      goTo(1)
    } catch (e) {
      setFormError(applyApiErrors(form, e))
    }
  })

  return (
    <form onSubmit={submit} noValidate>
      <StepShell
        title={property ? "Property details" : "Tell tenants about the property"}
        description={
          property
            ? "Saved as a draft. Changes here update the draft straight away."
            : "This creates a private draft. Nothing is visible to tenants until you publish."
        }
        primary={
          <Button type="submit" loading={form.formState.isSubmitting}>
            {property ? "Save and continue" : "Create draft and continue"} <ArrowRight />
          </Button>
        }
      >
        {formError && (
          <Alert variant="destructive" className="mb-5">
            <AlertCircle />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <PropertyFields control={form.control} />
      </StepShell>
    </form>
  )
}
