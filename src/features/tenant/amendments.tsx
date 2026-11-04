"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { Copy, FilePlus2, PenLine } from "lucide-react"
import { useState, useSyncExternalStore } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { TextField, TextareaField } from "@/components/shared/form-fields"
import { StatusBadge } from "@/components/shared/status-badge"
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
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import { formatDate, formatDateTime, formatMoney } from "@/lib/format"
import type { LeaseAmendmentView } from "./types"

/* The API has no "list amendments" route, so amendments seen on this device are remembered locally. */

const keyFor = (leaseId: string) => `teneo:lease-amendments:${leaseId}`
const EVENT = "teneo:amendments"
const EMPTY: LeaseAmendmentView[] = []
const snapshotCache = new Map<string, { raw: string | null; value: LeaseAmendmentView[] }>()

function read(leaseId: string): LeaseAmendmentView[] {
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(keyFor(leaseId))
  } catch {
    raw = null
  }
  const cached = snapshotCache.get(leaseId)
  if (cached && cached.raw === raw) return cached.value
  let value: LeaseAmendmentView[] = EMPTY
  try {
    value = raw ? (JSON.parse(raw) as LeaseAmendmentView[]) : EMPTY
  } catch {
    value = EMPTY
  }
  snapshotCache.set(leaseId, { raw, value })
  return value
}

function remember(leaseId: string, a: LeaseAmendmentView) {
  const next = [a, ...read(leaseId).filter((x) => x.id !== a.id)].slice(0, 20)
  try {
    window.localStorage.setItem(keyFor(leaseId), JSON.stringify(next))
  } catch {
    // Storage unavailable (private mode): the amendment still exists on the server.
  }
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb)
  window.addEventListener(EVENT, cb)
  return () => {
    window.removeEventListener("storage", cb)
    window.removeEventListener(EVENT, cb)
  }
}

function useAmendments(leaseId: string) {
  return useSyncExternalStore(
    subscribe,
    () => read(leaseId),
    () => EMPTY
  )
}

const KIND_LABEL = {
  END_DATE: "Change the end date",
  RENT: "Change the rent",
  OTHER: "Something else",
} as const
type Kind = keyof typeof KIND_LABEL

export function describeAmendment(payload: unknown, currency: string): string {
  if (!payload || typeof payload !== "object") return "Amendment"
  const p = payload as Record<string, unknown>
  const details = typeof p.details === "string" ? p.details : ""
  if (p.kind === "END_DATE" && typeof p.endDate === "string")
    return `End date → ${formatDate(p.endDate)}${details ? `. ${details}` : ""}`
  if (p.kind === "RENT" && typeof p.rentMinor === "number")
    return `Rent → ${formatMoney(p.rentMinor, currency)} a month${details ? `. ${details}` : ""}`
  return details || "Amendment"
}

const proposeSchema = z
  .object({
    kind: z.enum(["END_DATE", "RENT", "OTHER"]),
    endDate: z.string(),
    rent: z.string(),
    details: z
      .string()
      .trim()
      .min(10, "Describe the change in at least 10 characters")
      .max(1000, "Keep it under 1,000 characters"),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "END_DATE" && !/^\d{4}-\d{2}-\d{2}$/.test(v.endDate))
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "Pick the new end date" })
    if (v.kind === "RENT" && !(Number(v.rent) > 0))
      ctx.addIssue({ code: "custom", path: ["rent"], message: "Enter the new monthly rent" })
  })
type ProposeValues = z.infer<typeof proposeSchema>

/** Propose amendments, and sign one the owner shared by reference. */
export function AmendmentsPanel({
  leaseId,
  meId,
  currency,
  canPropose,
}: {
  leaseId: string
  meId: string
  currency: string
  canPropose: boolean
}) {
  const amendments = useAmendments(leaseId)
  const [proposeOpen, setProposeOpen] = useState(false)
  const [signOpen, setSignOpen] = useState(false)
  const [reference, setReference] = useState("")
  const [refError, setRefError] = useState<string | null>(null)

  const form = useForm<ProposeValues>({
    resolver: zodResolver(proposeSchema),
    defaultValues: { kind: "END_DATE", endDate: "", rent: "", details: "" },
  })
  const kind = useWatch({ control: form.control, name: "kind" })

  const propose = useMutation({
    meta: { silent: true },
    mutationFn: (v: ProposeValues) =>
      apiClient.post<LeaseAmendmentView>(`/leases/${leaseId}/amend`, {
        payload: {
          kind: v.kind,
          ...(v.kind === "END_DATE" ? { endDate: v.endDate } : {}),
          ...(v.kind === "RENT" ? { rentMinor: Math.round(Number(v.rent) * 100) } : {}),
          details: v.details,
        },
      }),
    onSuccess: (a) => {
      remember(leaseId, a)
      setProposeOpen(false)
      form.reset()
      toast.success("Amendment proposed", {
        description: "Share its reference with the owner so they can sign it.",
      })
    },
    onError: (e) => toast.error(isApiError(e) ? e.userMessage : "Couldn't propose the amendment. Try again."),
  })

  const sign = useMutation({
    meta: { silent: true },
    mutationFn: (id: string) =>
      apiClient.post<LeaseAmendmentView>(`/leases/${leaseId}/amendments/${id}/sign`, {}),
    onSuccess: (a) => {
      remember(leaseId, a)
      setSignOpen(false)
      setReference("")
      toast.success("Amendment signed")
    },
    onError: (e) => {
      if (isApiError(e) && (e.status === 404 || e.status === 400))
        setRefError("No amendment with that reference exists on this lease.")
      else if (isApiError(e) && e.status === 409)
        setRefError("That amendment was rejected and can't be signed.")
      else setRefError(isApiError(e) ? e.userMessage : "Couldn't sign. Try again.")
    },
  })

  const copy = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id)
      toast.success("Reference copied")
    } catch {
      toast.error("Couldn't copy. Select the reference and copy it manually.")
    }
  }

  return (
    <section aria-labelledby="amend-heading" className="rounded-xl border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="amend-heading" className="text-lg font-semibold">
            Amendments
          </h2>
          <p className="mt-0.5 max-w-prose text-sm text-muted-foreground">
            Changes to the signed terms. Teneo can&apos;t list amendments yet, so the ones you propose or sign
            here are remembered on this device.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog
            open={signOpen}
            onOpenChange={(o) => {
              setSignOpen(o)
              setRefError(null)
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <PenLine /> Sign by reference
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Sign an amendment</DialogTitle>
                <DialogDescription>Paste the reference the owner shared with you.</DialogDescription>
              </DialogHeader>
              <form
                id="sign-ref-form"
                noValidate
                className="grid gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  const id = reference.trim()
                  if (!/^[0-9a-f-]{36}$/i.test(id))
                    return setRefError("A reference looks like 3f2c…-…, 36 characters.")
                  setRefError(null)
                  sign.mutate(id)
                }}
              >
                <Field data-invalid={Boolean(refError) || undefined}>
                  <FieldLabel htmlFor="amend-ref">Amendment reference</FieldLabel>
                  <Input
                    id="amend-ref"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    autoComplete="off"
                    className="font-mono text-sm"
                    aria-invalid={Boolean(refError) || undefined}
                  />
                  {refError && <FieldError>{refError}</FieldError>}
                </Field>
              </form>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setSignOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" form="sign-ref-form" loading={sign.isPending}>
                  Sign amendment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {canPropose && (
            <Dialog
              open={proposeOpen}
              onOpenChange={(o) => {
                setProposeOpen(o)
                if (!o) form.reset()
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm">
                  <FilePlus2 /> Propose a change
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Propose an amendment</DialogTitle>
                  <DialogDescription>The owner has to sign it before it takes effect.</DialogDescription>
                </DialogHeader>
                <form
                  id="propose-form"
                  noValidate
                  onSubmit={form.handleSubmit((v) => propose.mutate(v))}
                  className="grid gap-4"
                >
                  <Controller
                    control={form.control}
                    name="kind"
                    render={({ field }) => (
                      <Field>
                        <FieldLabel htmlFor="amend-kind">What should change?</FieldLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger id="amend-kind" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
                              <SelectItem key={k} value={k}>
                                {KIND_LABEL[k]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  />
                  {kind === "END_DATE" && (
                    <TextField control={form.control} name="endDate" label="New end date" type="date" />
                  )}
                  {kind === "RENT" && (
                    <TextField
                      control={form.control}
                      name="rent"
                      label={`New monthly rent (${currency})`}
                      inputMode="decimal"
                      placeholder="25000"
                    />
                  )}
                  <TextareaField
                    control={form.control}
                    name="details"
                    label="Details"
                    rows={4}
                    placeholder="I'd like to extend by three months because my course runs until August."
                  />
                </form>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setProposeOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" form="propose-form" loading={propose.isPending}>
                    Send proposal
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {amendments.length > 0 && (
        <ul className="mt-4 flex flex-col divide-y rounded-lg border">
          {amendments.map((a) => (
            <li key={a.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[0.9375rem]">{describeAmendment(a.payload, currency)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {a.proposedByUserId === meId ? "Proposed by you" : "Proposed by the owner"} ·{" "}
                  {formatDateTime(a.createdAt)}
                  {a.signedAt ? ` · signed ${formatDate(a.signedAt)}` : ""}
                </p>
                {a.status === "PROPOSED" && a.proposedByUserId === meId && (
                  <button
                    type="button"
                    onClick={() => copy(a.id)}
                    className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded text-xs text-primary hover:underline"
                  >
                    <Copy className="size-3 shrink-0" aria-hidden />
                    <span className="truncate font-mono">{a.id}</span>
                    <span className="sr-only">Copy reference</span>
                  </button>
                )}
              </div>
              <StatusBadge status={a.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
