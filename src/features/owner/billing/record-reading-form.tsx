"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { TextField } from "@/components/shared/form-fields"
import { Button } from "@/components/ui/button"
import type { ReadingView } from "@/features/owner/types"
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import { readingSchema, todayIso, type ReadingValues } from "./schemas"

/** "Record reading" button that expands into an inline form on a meter card. */
export function RecordReading({ meterId, unitLabel }: { meterId: string; unitLabel: string }) {
  const [open, setOpen] = useState(false)
  if (!open)
    return (
      <Button variant="outline" size="sm" className="w-fit" onClick={() => setOpen(true)}>
        <Plus /> Record reading
      </Button>
    )
  return <RecordReadingForm meterId={meterId} unitLabel={unitLabel} onCancel={() => setOpen(false)} />
}

function RecordReadingForm({
  meterId,
  unitLabel,
  onCancel,
}: {
  meterId: string
  unitLabel: string
  onCancel: () => void
}) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<ReadingValues>({
    resolver: zodResolver(readingSchema),
    defaultValues: { readingDate: "", readingValue: "", notes: "" },
    mode: "onTouched",
  })

  // "Today" is only known in the browser; fill it after mount.
  useEffect(() => {
    if (!form.getValues("readingDate")) form.setValue("readingDate", todayIso())
  }, [form])

  const record = useMutation({
    meta: { silent: true },
    mutationFn: (v: ReadingValues) =>
      apiClient.post<ReadingView>(`/meters/${meterId}/readings`, {
        readingDate: v.readingDate,
        readingValue: v.readingValue,
        ...(v.notes ? { notes: v.notes } : {}),
      }),
    onSuccess: (r) => {
      toast.success("Reading saved", { description: `${Number(r.readingValue)} ${unitLabel}` })
      form.reset({ readingDate: form.getValues("readingDate"), readingValue: "", notes: "" })
      router.refresh()
    },
    onError: (e) => {
      if (!isApiError(e)) return setFormError("Couldn't save the reading. Try again.")
      const fields = e.fieldErrors()
      if (e.errors.some((x) => x.code === "DUPLICATE"))
        return form.setError("readingDate", { message: "There's already a reading for this date" })
      let mapped = false
      for (const key of ["readingDate", "readingValue", "notes"] as const) {
        if (fields[key]) {
          form.setError(key, { message: fields[key] })
          mapped = true
        }
      }
      if (!mapped) setFormError(e.userMessage)
    },
  })

  return (
    <form
      noValidate
      aria-label="Record a reading"
      className="grid gap-3"
      onSubmit={form.handleSubmit((v) => {
        setFormError(null)
        record.mutate(v)
      })}
    >
      <div className="grid grid-cols-2 gap-3">
        <TextField control={form.control} name="readingDate" label="Date" type="date" />
        <TextField
          control={form.control}
          name="readingValue"
          label={`Reading (${unitLabel})`}
          inputMode="decimal"
          placeholder="1250.5"
        />
      </div>
      <TextField control={form.control} name="notes" label="Notes" placeholder="Optional" maxLength={500} />
      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={record.isPending}>
          Save reading
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={record.isPending}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
