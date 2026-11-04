"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { AlertCircle, CheckCircle2, FilePlus2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
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
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import { formatDate, formatMoney } from "@/lib/format"
import type { GenerateBillsResult } from "@/features/owner/types"
import {
  defaultPeriod,
  generateInvoiceSchema,
  todayIso,
  type BillableLease,
  type GenerateInvoiceValues,
} from "./schemas"

export function GenerateInvoiceDialog({ leases }: { leases: BillableLease[] }) {
  const [open, setOpen] = useState(false)
  if (leases.length === 0) {
    return (
      <Button disabled title="Invoices can only be generated for active leases">
        <FilePlus2 /> Generate invoice
      </Button>
    )
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <FilePlus2 /> Generate invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {/* Remount per open so defaults use today's date and the result panel resets. */}
        {open && <GenerateInvoiceForm leases={leases} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function GenerateInvoiceForm({ leases, onDone }: { leases: BillableLease[]; onDone: () => void }) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  const [result, setResult] = useState<GenerateBillsResult | null>(null)
  const schema = useMemo(() => generateInvoiceSchema(leases), [leases])
  const today = useMemo(() => todayIso(), [])

  const form = useForm<GenerateInvoiceValues>({
    resolver: zodResolver(schema),
    defaultValues: { leaseId: leases[0].id, ...defaultPeriod(leases[0], today) },
    mode: "onTouched",
  })

  const generate = useMutation({
    meta: { silent: true },
    mutationFn: (v: GenerateInvoiceValues) => apiClient.post<GenerateBillsResult>("/bills/generate", v),
    onSuccess: (data) => {
      setResult(data)
      toast.success("Invoice ready", {
        description: `${formatMoney(data.invoice.totalMinor, data.invoice.currency)} due ${formatDate(data.invoice.dueDate)}`,
      })
      router.refresh()
    },
    onError: (e) => {
      if (!isApiError(e)) return setFormError("Couldn't generate the invoice. Try again.")
      if (e.code === "STATE_MACHINE")
        return setFormError("This lease isn't active any more, so it can't be billed.")
      const fields = e.fieldErrors()
      let mapped = false
      for (const key of ["periodStart", "periodEnd", "leaseId"] as const) {
        if (fields[key]) {
          form.setError(key, { message: fields[key] })
          mapped = true
        }
      }
      if (!mapped) setFormError(e.userMessage)
    },
  })

  if (result) {
    const inv = result.invoice
    return (
      <>
        <DialogHeader>
          <DialogTitle>Invoice generated</DialogTitle>
          <DialogDescription>
            If an invoice already existed for this lease and start date, Teneo returns that one instead of
            creating a duplicate.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-start gap-3 rounded-lg bg-success-soft p-4">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="col-span-2">
              <dt className="text-muted-foreground">Period</dt>
              <dd className="font-medium">
                {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total</dt>
              <dd className="font-medium tabular-nums">{formatMoney(inv.totalMinor, inv.currency)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Due</dt>
              <dd className="font-medium">{formatDate(inv.dueDate)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Rent</dt>
              <dd className="tabular-nums">{formatMoney(inv.baseRentMinor, inv.currency)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Utility bills</dt>
              <dd className="tabular-nums">
                {result.bills.length} · {formatMoney(inv.utilityShareMinor, inv.currency)}
              </dd>
            </div>
          </dl>
        </div>
        <DialogFooter>
          <Button onClick={onDone}>Done</Button>
        </DialogFooter>
      </>
    )
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Generate an invoice</DialogTitle>
        <DialogDescription>
          Rent for the period, plus utility charges from meters that have readings at both ends of it.
        </DialogDescription>
      </DialogHeader>
      <form
        id="generate-invoice"
        noValidate
        className="grid gap-4"
        onSubmit={form.handleSubmit((v) => {
          setFormError(null)
          generate.mutate(v)
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
          name="leaseId"
          render={({ field, fieldState }) => {
            const lease = leases.find((l) => l.id === field.value)
            return (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel htmlFor="leaseId">Lease</FieldLabel>
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v)
                    const next = leases.find((l) => l.id === v)
                    if (next) {
                      const p = defaultPeriod(next, today)
                      form.setValue("periodStart", p.periodStart)
                      form.setValue("periodEnd", p.periodEnd)
                      form.clearErrors(["periodStart", "periodEnd"])
                    }
                  }}
                >
                  <SelectTrigger id="leaseId" className="w-full">
                    <SelectValue placeholder="Choose a lease" />
                  </SelectTrigger>
                  <SelectContent>
                    {leases.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.label} · {formatMoney(l.rentMinor, l.currency)}/mo
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {lease && !fieldState.error && (
                  <FieldDescription>
                    Lease runs {formatDate(lease.start)} – {formatDate(lease.end)}
                  </FieldDescription>
                )}
                <FieldError errors={[fieldState.error]} />
              </Field>
            )
          }}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField control={form.control} name="periodStart" label="Period start" type="date" />
          <TextField control={form.control} name="periodEnd" label="Period end" type="date" />
        </div>
      </form>
      <DialogFooter>
        <Button variant="ghost" onClick={onDone} disabled={generate.isPending}>
          Cancel
        </Button>
        <Button type="submit" form="generate-invoice" loading={generate.isPending}>
          Generate invoice
        </Button>
      </DialogFooter>
    </>
  )
}
