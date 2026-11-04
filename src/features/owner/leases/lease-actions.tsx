"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { AlertCircle, CircleSlash, PenLine } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { TextareaField } from "@/components/shared/form-fields"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import type { LeaseView } from "@/features/owner/types"
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import { formatDate } from "@/lib/format"
import type { LeaseStatus } from "@/types/domain"

// Mirrors B7A6 terminate body: { reason: string(1..1000) } strict.
const terminateSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Tell the tenant why the lease is ending")
    .max(1000, "Keep it under 1,000 characters"),
})
type TerminateValues = z.infer<typeof terminateSchema>

export function LeaseActions({
  leaseId,
  status,
  ownerSignedAt,
}: {
  leaseId: string
  status: LeaseStatus
  ownerSignedAt: string | null
}) {
  const router = useRouter()
  const [signError, setSignError] = useState<string | null>(null)

  const sign = useMutation({
    meta: { silent: true },
    mutationFn: () => apiClient.post<LeaseView>(`/leases/${leaseId}/sign`, {}),
    onSuccess: (lease) => {
      toast.success(lease.status === "SIGNED" ? "Lease signed by both parties" : "You signed the lease", {
        description:
          lease.status === "SIGNED"
            ? "It becomes active when the tenant confirms move-in."
            : "We'll wait for the tenant's signature.",
      })
      router.refresh()
    },
    onError: (e) => setSignError(isApiError(e) ? e.userMessage : "Couldn't sign the lease. Try again."),
  })

  const form = useForm<TerminateValues>({
    resolver: zodResolver(terminateSchema),
    defaultValues: { reason: "" },
  })
  const [terminateError, setTerminateError] = useState<string | null>(null)
  const terminate = useMutation({
    meta: { silent: true },
    mutationFn: (v: TerminateValues) =>
      apiClient.post<LeaseView>(`/leases/${leaseId}/terminate`, { reason: v.reason }),
    onSuccess: () => {
      toast.success("Lease terminated", {
        description: "The room moves to a maintenance check before relisting.",
      })
      form.reset()
      router.refresh()
    },
  })

  if (status === "DRAFT") {
    if (ownerSignedAt) {
      return (
        <div className="flex flex-col gap-3">
          <Button disabled className="w-full">
            <PenLine /> Signed
          </Button>
          <p className="text-sm text-muted-foreground">
            You signed on {formatDate(ownerSignedAt)}. Waiting for the tenant to sign.
          </p>
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-3">
        <ConfirmDialog
          trigger={
            <Button className="w-full">
              <PenLine /> Sign lease
            </Button>
          }
          title="Sign this lease?"
          description="Your signature is binding. The lease is signed once the tenant signs too."
          confirmLabel="Sign lease"
          pending={sign.isPending}
          onConfirm={async () => {
            setSignError(null)
            await sign.mutateAsync()
          }}
        >
          {signError && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{signError}</AlertDescription>
            </Alert>
          )}
        </ConfirmDialog>
        <p className="text-sm text-muted-foreground">Both you and the tenant need to sign.</p>
      </div>
    )
  }

  if (status === "SIGNED") {
    return (
      <p className="text-sm text-muted-foreground">
        Both parties have signed. The lease starts when the tenant confirms they&apos;ve moved in.
      </p>
    )
  }

  if (status === "ACTIVE") {
    return (
      <div className="flex flex-col gap-3">
        <ConfirmDialog
          trigger={
            <Button variant="destructive-soft" className="w-full">
              <CircleSlash /> Terminate lease
            </Button>
          }
          title="Terminate this lease?"
          description="This ends the tenancy now and can't be undone. The room goes to a maintenance check before you can relist it."
          confirmLabel="Terminate lease"
          destructive
          pending={terminate.isPending}
          onConfirm={async () => {
            setTerminateError(null)
            const valid = await form.trigger()
            if (!valid) throw new Error("invalid")
            try {
              await terminate.mutateAsync(form.getValues())
            } catch (e) {
              const fields = isApiError(e) ? e.fieldErrors() : {}
              if (fields.reason) form.setError("reason", { message: fields.reason })
              else setTerminateError(isApiError(e) ? e.userMessage : "Couldn't terminate the lease.")
              throw e
            }
          }}
        >
          <form onSubmit={(e) => e.preventDefault()} noValidate className="grid gap-3">
            {terminateError && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{terminateError}</AlertDescription>
              </Alert>
            )}
            <TextareaField
              control={form.control}
              name="reason"
              label="Reason"
              rows={4}
              placeholder="e.g. Tenant gave notice and is moving out on 30 November."
            />
          </form>
        </ConfirmDialog>
        <p className="text-sm text-muted-foreground">Either party can end an active lease.</p>
      </div>
    )
  }

  return <p className="text-sm text-muted-foreground">This lease is closed. No further actions.</p>
}
