"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { RoomFields } from "./fields"
import { applyApiErrors } from "./form-errors"
import { ROOM_FIELD_ALIASES, emptyRoom, roomSchema, type RoomValues } from "./schemas"

/** Create/edit form for one room. `onSubmit` throws ApiError → mapped to fields. */
export function RoomForm({
  defaultValues = emptyRoom,
  currency = "BDT",
  submitLabel,
  onSubmit,
  onCancel,
  id = "room-form",
}: {
  defaultValues?: RoomValues
  currency?: string
  submitLabel: string
  onSubmit: (values: RoomValues, dirty: boolean) => Promise<void>
  onCancel?: () => void
  id?: string
}) {
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<RoomValues>({
    resolver: zodResolver(roomSchema),
    defaultValues,
    mode: "onTouched",
  })
  // Read during render so react-hook-form tracks it (formState is a lazy proxy).
  const { isDirty } = form.formState

  const submit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      await onSubmit(values, isDirty)
    } catch (e) {
      setFormError(applyApiErrors(form, e, ROOM_FIELD_ALIASES))
    }
  })

  return (
    <form id={id} onSubmit={submit} noValidate className="flex flex-col gap-5">
      {formError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      <RoomFields control={form.control} currency={currency} />
      <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={form.formState.isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
