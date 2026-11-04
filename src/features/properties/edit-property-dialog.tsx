"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, Pencil } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

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
import { apiClient } from "@/lib/api/client"
import type { PropertyView } from "@/types/domain"
import { PropertyFields } from "./fields"
import { applyApiErrors } from "./form-errors"
import { propertySchema, propertyToValues, toPropertyPayload, type PropertyValues } from "./schemas"

export function EditPropertyDialog({ property }: { property: PropertyView }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<PropertyValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: propertyToValues(property),
    mode: "onTouched",
  })
  // Read during render so react-hook-form tracks it (formState is a lazy proxy).
  const { isDirty } = form.formState

  const submit = form.handleSubmit(async (values) => {
    setFormError(null)
    if (!isDirty) return setOpen(false)
    try {
      const saved = await apiClient.patch<PropertyView>(
        `/properties/${property.id}`,
        toPropertyPayload(values, "patch")
      )
      form.reset(propertyToValues(saved))
      toast.success("Property details saved")
      setOpen(false)
      router.refresh()
    } catch (e) {
      setFormError(applyApiErrors(form, e))
    }
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) {
          form.reset(propertyToValues(property))
          setFormError(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil /> Edit details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit property details</DialogTitle>
          <DialogDescription>
            {property.status === "PUBLISHED"
              ? "Changes show on every live room of this property straight away."
              : "This property is a draft, so changes stay private until you publish."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          {formError && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <PropertyFields control={form.control} />
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              Save changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
