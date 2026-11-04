"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { AlertCircle, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { TextField } from "@/components/shared/form-fields"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UTILITY_LABEL, UTILITY_UNIT } from "@/features/owner/labels"
import type { MeterView } from "@/features/owner/types"
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import { UTILITY_TYPES, meterSchema, takaToMinor, type MeterValues } from "./schemas"

const FIELDS = ["utilityType", "label", "unitLabel"] as const

export function CreateMeterDialog({
  propertyId,
  propertyTitle,
}: {
  propertyId: string
  propertyTitle: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<MeterValues>({
    resolver: zodResolver(meterSchema),
    defaultValues: { utilityType: "ELECTRICITY", label: "", rate: "", unitLabel: UTILITY_UNIT.ELECTRICITY },
    mode: "onTouched",
  })

  const create = useMutation({
    meta: { silent: true },
    mutationFn: (v: MeterValues) =>
      apiClient.post<MeterView>(`/properties/${propertyId}/meters`, {
        utilityType: v.utilityType,
        label: v.label,
        ratePerUnitMinor: takaToMinor(v.rate),
        currency: "BDT",
        unitLabel: v.unitLabel,
      }),
    onSuccess: (meter) => {
      toast.success("Meter added", { description: `${meter.label} · ${UTILITY_LABEL[meter.utilityType]}` })
      setOpen(false)
      form.reset()
      router.refresh()
    },
    onError: (e) => {
      if (!isApiError(e)) return setFormError("Couldn't add the meter. Try again.")
      const fields = e.fieldErrors()
      let mapped = false
      for (const key of FIELDS) {
        if (fields[key]) {
          form.setError(key, { message: fields[key] })
          mapped = true
        }
      }
      if (fields.ratePerUnitMinor) {
        form.setError("rate", { message: fields.ratePerUnitMinor })
        mapped = true
      }
      if (!mapped) setFormError(e.userMessage)
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setFormError(null)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus /> Add meter
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a utility meter</DialogTitle>
          <DialogDescription>
            For {propertyTitle}. Readings on this meter are billed to tenants when you generate invoices.
          </DialogDescription>
        </DialogHeader>
        <form
          id="create-meter"
          noValidate
          className="grid gap-4"
          onSubmit={form.handleSubmit((v) => {
            setFormError(null)
            create.mutate(v)
          })}
        >
          {formError && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <Controller
            control={form.control}
            name="utilityType"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel htmlFor="utilityType">Utility</FieldLabel>
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    const prev = field.value
                    field.onChange(v)
                    // Follow the unit unless the owner typed their own.
                    if (form.getValues("unitLabel") === UTILITY_UNIT[prev])
                      form.setValue("unitLabel", UTILITY_UNIT[v as MeterValues["utilityType"]])
                  }}
                >
                  <SelectTrigger id="utilityType" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UTILITY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {UTILITY_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <TextField
            control={form.control}
            name="label"
            label="Name"
            placeholder="Main electricity, Flat 3B water…"
            maxLength={120}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              control={form.control}
              name="rate"
              label="Rate per unit (৳)"
              inputMode="decimal"
              placeholder="9.50"
            />
            <TextField control={form.control} name="unitLabel" label="Unit" maxLength={40} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={create.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="create-meter" loading={create.isPending}>
            Add meter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
