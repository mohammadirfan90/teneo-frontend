"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, CalendarPlus, Plus, X } from "lucide-react"
import { useState } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"

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
import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import type { ViewingView } from "@/types/domain"

const MAX_SLOTS = 20

// Backend: proposedSlots = ISO datetimes in UTC "Z" form, 1..20 entries.
const schema = z
  .object({
    slots: z
      .array(
        z.object({
          value: z
            .string()
            .min(1, "Pick a date and time")
            .refine((v) => !Number.isNaN(new Date(v).getTime()), "Use a valid date and time")
            .refine((v) => new Date(v).getTime() > Date.now(), "Choose a time in the future"),
        })
      )
      .min(1, "Offer at least one time")
      .max(MAX_SLOTS, `Offer at most ${MAX_SLOTS} times`),
  })
  .superRefine((v, ctx) => {
    const seen = new Set<string>()
    v.slots.forEach((s, i) => {
      if (seen.has(s.value))
        ctx.addIssue({ code: "custom", path: ["slots", i, "value"], message: "Already offered" })
      seen.add(s.value)
    })
  })
type Values = z.infer<typeof schema>

/** "2026-11-08T15:30" in the owner's local time → "2026-11-08T09:30:00.000Z". */
export function localToUtcIso(local: string): string {
  return new Date(local).toISOString()
}

/** Local `datetime-local` value for a Date. */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function suggestion(daysAhead: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  d.setHours(17, 0, 0, 0)
  return toLocalInput(d)
}

export function ProposeViewingDialog({
  applicationId,
  tenantName,
  onProposed,
}: {
  applicationId: string
  tenantName: string
  onProposed: (viewing: ViewingView) => void
}) {
  const [open, setOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { slots: [{ value: "" }] },
    mode: "onTouched",
  })
  const slots = useFieldArray({ control: form.control, name: "slots" })

  const submit = form.handleSubmit(async (v) => {
    setFormError(null)
    try {
      const viewing = await apiClient.post<ViewingView>(`/applications/${applicationId}/viewing`, {
        proposedSlots: v.slots.map((s) => localToUtcIso(s.value)),
      })
      onProposed(viewing)
      setOpen(false)
    } catch (e) {
      if (isApiError(e)) {
        const fields = e.fieldErrors()
        let mapped = false
        for (const [field, message] of Object.entries(fields)) {
          const m = /^proposedSlots\.(\d+)$/.exec(field)
          if (m) {
            form.setError(`slots.${Number(m[1])}.value`, { message })
            mapped = true
          }
        }
        if (!mapped)
          setFormError(
            e.status === 409
              ? "This application can't get a viewing in its current status. Refresh the page."
              : e.userMessage
          )
      } else setFormError("Couldn't send the times. Try again.")
    }
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) form.reset({ slots: [{ value: suggestion(2) }, { value: suggestion(3) }] })
        else setFormError(null)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <CalendarPlus /> Propose viewing times
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Propose viewing times</DialogTitle>
          <DialogDescription>
            Offer {tenantName} up to {MAX_SLOTS} times in your local time zone. You confirm one afterwards,
            and the application moves to “viewing scheduled”.
          </DialogDescription>
        </DialogHeader>
        <form id="viewing-form" onSubmit={submit} noValidate className="flex flex-col gap-3">
          {formError && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <ol className="flex flex-col gap-2">
            {slots.fields.map((f, i) => {
              const err = form.formState.errors.slots?.[i]?.value
              return (
                <li key={f.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <label htmlFor={`slot-${i}`} className="w-14 shrink-0 text-sm text-muted-foreground">
                      Time {i + 1}
                    </label>
                    <Input
                      id={`slot-${i}`}
                      type="datetime-local"
                      aria-invalid={err ? true : undefined}
                      {...form.register(`slots.${i}.value`)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove time ${i + 1}`}
                      disabled={slots.fields.length === 1}
                      onClick={() => slots.remove(i)}
                    >
                      <X />
                    </Button>
                  </div>
                  {err && <FieldError className="pl-16" errors={[err]} />}
                </li>
              )
            })}
          </ol>
          {form.formState.errors.slots?.root && <FieldError errors={[form.formState.errors.slots.root]} />}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start"
            disabled={slots.fields.length >= MAX_SLOTS}
            onClick={() => slots.append({ value: "" })}
          >
            <Plus /> Add another time
          </Button>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form="viewing-form" loading={form.formState.isSubmitting}>
            Send {slots.fields.length === 1 ? "1 time" : `${slots.fields.length} times`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
