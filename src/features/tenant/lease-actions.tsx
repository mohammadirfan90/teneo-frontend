"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { DoorOpen, FilePen, FileSignature, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, type ReactNode } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { TextareaField } from "@/components/shared/form-fields"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import { formatDate } from "@/lib/format"
import type { LeaseView } from "./types"

function errorText(e: unknown, fallback: string): string {
  if (!isApiError(e)) return fallback
  if (e.status === 409) return "The lease changed in the meantime. The page has been refreshed."
  return e.userMessage
}

/**
 * The one next step on a lease, per the lease state machine:
 * DRAFT → sign · SIGNED → confirm move-in · ACTIVE → terminate (with reason).
 */
export function LeaseActions({ lease, meId }: { lease: LeaseView; meId: string }) {
  const iSigned = lease.signatures.some((s) => s.signerUserId === meId)
  const ownerSigned = lease.signatures.some((s) => s.signerRole === "OWNER")

  if (lease.status === "DRAFT") {
    if (iSigned)
      return (
        <ActionFrame
          icon={FileSignature}
          title="You've signed"
          body={
            ownerSigned
              ? "Both signatures are in; the lease is being finalised."
              : "Waiting for the owner to sign. The lease becomes binding once both of you have signed."
          }
        />
      )
    return <SignLease lease={lease} ownerSigned={ownerSigned} />
  }
  if (lease.status === "SIGNED") return <ConfirmMoveIn lease={lease} />
  if (lease.status === "ACTIVE") return <TerminateLease lease={lease} />
  return (
    <ActionFrame
      icon={LogOut}
      title={lease.status === "TERMINATED" ? "This lease was terminated" : "This lease has ended"}
      body={lease.endedAt ? `Closed on ${formatDate(lease.endedAt)}.` : "No further actions are available."}
    />
  )
}

function ActionFrame({
  icon: Icon,
  title,
  body,
  children,
}: {
  icon: typeof FileSignature
  title: string
  body: string
  children?: ReactNode
}) {
  return (
    <section
      aria-label="Next step"
      className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:p-5"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="flex-1">
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </section>
  )
}

function SignLease({ lease, ownerSigned }: { lease: LeaseView; ownerSigned: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const sign = useMutation({
    meta: { silent: true },
    mutationFn: () => apiClient.post<LeaseView>(`/leases/${lease.id}/sign`, {}),
    onSuccess: (updated) => {
      setOpen(false)
      toast.success(updated.status === "SIGNED" ? "Lease signed by both parties" : "You signed the lease", {
        description:
          updated.status === "SIGNED"
            ? "Confirm your move-in once you have the keys."
            : "Waiting for the owner.",
      })
      router.refresh()
    },
    onError: (e) => {
      toast.error(errorText(e, "Couldn't sign the lease. Try again."))
      router.refresh()
    },
  })

  return (
    <ActionFrame
      icon={FileSignature}
      title="Your signature is needed"
      body={
        ownerSigned
          ? "The owner has signed. Sign to make the lease binding."
          : "Review the terms below and sign. The owner signs separately."
      }
    >
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) setAgreed(false)
        }}
      >
        <DialogTrigger asChild>
          <Button>
            <FilePen /> Sign lease
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign this lease?</DialogTitle>
            <DialogDescription>
              {formatDate(lease.startDate)} to {formatDate(lease.endDate)}. Signing can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-start gap-3 rounded-lg bg-surface-2 p-3 text-sm">
            <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />I
            have read the rent, deposit and dates of this lease and agree to them.
          </label>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Not yet
            </Button>
            <Button onClick={() => sign.mutate()} disabled={!agreed} loading={sign.isPending}>
              Sign lease
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ActionFrame>
  )
}

function ConfirmMoveIn({ lease }: { lease: LeaseView }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const confirm = useMutation({
    meta: { silent: true },
    mutationFn: () => apiClient.post<LeaseView>(`/leases/${lease.id}/confirm-move-in`, {}),
    onSuccess: () => {
      setOpen(false)
      toast.success("Move-in confirmed", { description: "Your lease is now active." })
      router.refresh()
    },
    onError: (e) => {
      toast.error(errorText(e, "Couldn't confirm your move-in. Try again."))
      router.refresh()
    },
  })
  return (
    <ActionFrame
      icon={DoorOpen}
      title="Signed by both parties"
      body="Confirm once you've moved in. That starts the lease and rent billing."
    >
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <DoorOpen /> Confirm move-in
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm you&apos;ve moved in?</DialogTitle>
            <DialogDescription>
              The lease becomes active and the room is marked as occupied. Only do this once you have the
              keys.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => confirm.mutate()} loading={confirm.isPending}>
              Yes, I&apos;ve moved in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ActionFrame>
  )
}

// Mirrors B7A6 terminate body: reason 1..1000 (strict).
const terminateSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "Explain in at least 10 characters so the owner understands")
    .max(1000, "Keep it under 1,000 characters"),
})
type TerminateValues = z.infer<typeof terminateSchema>

function TerminateLease({ lease }: { lease: LeaseView }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const form = useForm<TerminateValues>({
    resolver: zodResolver(terminateSchema),
    defaultValues: { reason: "" },
  })
  const terminate = useMutation({
    meta: { silent: true },
    mutationFn: (v: TerminateValues) => apiClient.post<LeaseView>(`/leases/${lease.id}/terminate`, v),
    onSuccess: () => {
      setOpen(false)
      toast.success("Lease terminated")
      router.refresh()
    },
    onError: (e) => {
      if (isApiError(e) && e.fieldErrors().reason)
        form.setError("reason", { message: e.fieldErrors().reason })
      else toast.error(errorText(e, "Couldn't terminate the lease. Try again."))
    },
  })
  return (
    <ActionFrame
      icon={FileSignature}
      title="Lease is active"
      body={`Runs until ${formatDate(lease.endDate)}. Rent invoices arrive under Rent & bills.`}
    >
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) form.reset()
        }}
      >
        <DialogTrigger asChild>
          <Button variant="outline">
            <LogOut /> End lease early
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End this lease early?</DialogTitle>
            <DialogDescription>
              The lease is terminated immediately and the room goes back to the owner for a check. This
              can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <form
            id="terminate-form"
            noValidate
            onSubmit={form.handleSubmit((v) => terminate.mutate(v))}
            className="grid gap-4"
          >
            <TextareaField
              control={form.control}
              name="reason"
              label="Reason"
              rows={4}
              placeholder="I'm relocating to Chattogram for work at the end of the month."
            />
          </form>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Keep lease
            </Button>
            <Button type="submit" form="terminate-form" variant="destructive" loading={terminate.isPending}>
              Terminate lease
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ActionFrame>
  )
}
