"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { AlertCircle, FilePlus2, PenLine } from "lucide-react"
import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { TextField, TextareaField } from "@/components/shared/form-fields"
import { StatusBadge } from "@/components/shared/status-badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLocalRecords, useMounted } from "@/features/owner/local-records"
import type { LeaseAmendmentView } from "@/features/owner/types"
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import { formatDate, formatDateTime, formatMoney } from "@/lib/format"

const KINDS = ["RENT_CHANGE", "END_DATE_CHANGE", "OTHER"] as const
type Kind = (typeof KINDS)[number]
const KIND_LABEL: Record<Kind, string> = {
  RENT_CHANGE: "Rent change",
  END_DATE_CHANGE: "New end date",
  OTHER: "Other change",
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// The backend accepts any JSON `payload` plus an optional `note` (≤1000). We give it a small, typed shape.
const schema = z
  .object({
    kind: z.enum(KINDS),
    rent: z.string().trim(),
    effectiveFrom: z.string(),
    endDate: z.string(),
    summary: z.string().trim().max(1000, "Keep it under 1,000 characters"),
    note: z.string().trim().max(1000, "Keep it under 1,000 characters"),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "RENT_CHANGE") {
      const n = Number(v.rent)
      if (!v.rent || !Number.isFinite(n) || n <= 0)
        ctx.addIssue({ code: "custom", path: ["rent"], message: "Enter the new monthly rent in taka" })
      else if (n > 100_000_000)
        ctx.addIssue({ code: "custom", path: ["rent"], message: "That rent looks too high" })
      if (!ISO_DATE.test(v.effectiveFrom))
        ctx.addIssue({
          code: "custom",
          path: ["effectiveFrom"],
          message: "Pick the date the new rent applies from",
        })
    }
    if (v.kind === "END_DATE_CHANGE" && !ISO_DATE.test(v.endDate))
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "Pick the new end date" })
    if (v.kind === "OTHER" && v.summary.length < 5)
      ctx.addIssue({ code: "custom", path: ["summary"], message: "Describe the change in a few words" })
  })
type Values = z.infer<typeof schema>

function toPayload(v: Values): Record<string, unknown> {
  if (v.kind === "RENT_CHANGE")
    return {
      type: "RENT_CHANGE",
      rentMinor: Math.round(Number(v.rent) * 100),
      effectiveFrom: v.effectiveFrom,
    }
  if (v.kind === "END_DATE_CHANGE") return { type: "END_DATE_CHANGE", endDate: v.endDate }
  return { type: "OTHER", summary: v.summary }
}

function describe(payload: unknown, currency: string): string {
  if (typeof payload !== "object" || payload === null) return "Change to the lease"
  const p = payload as Record<string, unknown>
  if (p.type === "RENT_CHANGE" && (typeof p.rentMinor === "number" || typeof p.rentMinor === "string"))
    return `Rent becomes ${formatMoney(p.rentMinor, currency)} / month from ${formatDate(String(p.effectiveFrom ?? ""))}`
  if (p.type === "END_DATE_CHANGE") return `Lease ends on ${formatDate(String(p.endDate ?? ""))}`
  if (typeof p.summary === "string") return p.summary
  return "Change to the lease"
}

export function Amendments({
  leaseId,
  currency,
  canPropose,
}: {
  leaseId: string
  currency: string
  canPropose: boolean
}) {
  const mounted = useMounted()
  const stored = useLocalRecords((s) => s.amendments[leaseId])
  const save = useLocalRecords((s) => s.saveAmendment)
  const list = mounted ? (stored ?? []) : []
  const [open, setOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { kind: "RENT_CHANGE", rent: "", effectiveFrom: "", endDate: "", summary: "", note: "" },
    mode: "onTouched",
  })
  const kind = useWatch({ control: form.control, name: "kind" })

  const propose = useMutation({
    meta: { silent: true },
    mutationFn: (v: Values) =>
      apiClient.post<LeaseAmendmentView>(`/leases/${leaseId}/amend`, {
        payload: toPayload(v),
        ...(v.note ? { note: v.note } : {}),
      }),
    onSuccess: (a) => {
      save(leaseId, a)
      toast.success("Amendment proposed", {
        description: "It's recorded on the lease until a party signs it.",
      })
      form.reset()
      setOpen(false)
    },
    onError: (e) => {
      if (!isApiError(e)) return setFormError("Couldn't propose the amendment. Try again.")
      const fields = e.fieldErrors()
      if (fields.note) form.setError("note", { message: fields.note })
      else setFormError(e.userMessage)
    },
  })

  const sign = useMutation({
    mutationFn: (aid: string) =>
      apiClient.post<LeaseAmendmentView>(`/leases/${leaseId}/amendments/${aid}/sign`, {}),
    onSuccess: (a) => {
      save(leaseId, a)
      toast.success("Amendment signed")
    },
  })

  return (
    <section
      aria-labelledby="amendments"
      className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="amendments" className="text-base font-semibold">
            Amendments
          </h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Teneo can&apos;t list a lease&apos;s amendments yet, so only changes proposed from this browser
            appear here.
          </p>
        </div>
        {canPropose && !open && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <FilePlus2 /> Propose a change
          </Button>
        )}
      </div>

      {open && (
        <form
          onSubmit={form.handleSubmit((v) => {
            setFormError(null)
            propose.mutate(v)
          })}
          noValidate
          className="grid gap-4 rounded-lg border bg-surface-2/40 p-4"
        >
          {formError && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <Controller
            control={form.control}
            name="kind"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel htmlFor="amend-kind">What changes?</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="amend-kind" className="w-full sm:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {KIND_LABEL[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          {kind === "RENT_CHANGE" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                control={form.control}
                name="rent"
                label={`New monthly rent (${currency === "BDT" ? "৳" : currency})`}
                inputMode="decimal"
                placeholder="27000"
              />
              <TextField control={form.control} name="effectiveFrom" label="Applies from" type="date" />
            </div>
          )}
          {kind === "END_DATE_CHANGE" && (
            <TextField
              control={form.control}
              name="endDate"
              label="New end date"
              type="date"
              className="sm:w-64"
            />
          )}
          {kind === "OTHER" && (
            <TextareaField
              control={form.control}
              name="summary"
              label="Describe the change"
              rows={3}
              placeholder="e.g. Tenant may keep a bicycle in the ground-floor storage room."
            />
          )}
          <TextareaField
            control={form.control}
            name="note"
            label="Note to the tenant"
            description="Optional"
            rows={2}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false)
                setFormError(null)
                form.reset()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={propose.isPending}>
              Propose amendment
            </Button>
          </div>
        </form>
      )}

      {list.length === 0 ? (
        !open && <p className="text-sm text-subtle">No amendments proposed from this browser.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {list.map((a) => (
            <li key={a.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium">{describe(a.payload, currency)}</p>
                <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
                  Proposed {formatDateTime(a.createdAt)}
                  {a.signedAt ? ` · signed ${formatDateTime(a.signedAt)}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={a.status} />
                {a.status === "PROPOSED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    loading={sign.isPending && sign.variables === a.id}
                    onClick={() => sign.mutate(a.id)}
                  >
                    <PenLine /> Sign
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
