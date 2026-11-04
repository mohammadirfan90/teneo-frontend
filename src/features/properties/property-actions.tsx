"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Rocket, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import type { PublishPropertyResult } from "@/features/owner/types"
import type { PropertyStatus } from "@/types/domain"

function publishError(e: unknown): string {
  if (isApiError(e) && e.code === "KYC_REQUIRED")
    return "Your identity verification must be approved before you can publish."
  if (isApiError(e) && e.status === 409) return "This property is already published."
  return isApiError(e) ? e.userMessage : "Couldn't publish. Try again."
}

export function PublishPropertyButton({
  id,
  size = "sm",
  variant = "outline",
}: {
  id: string
  size?: "sm" | "default"
  variant?: "outline" | "default"
}) {
  const router = useRouter()
  const qc = useQueryClient()
  const publish = useMutation({
    meta: { silent: true },
    mutationFn: () => apiClient.post<PublishPropertyResult>(`/properties/${id}/publish`),
    onSuccess: (r) => {
      toast.success("Property published", {
        description:
          r.roomsPublished === 1 ? "1 draft room went live." : `${r.roomsPublished} draft rooms went live.`,
      })
      // Draft rooms shown from this browser are now published too.
      void qc.invalidateQueries({ queryKey: ["owner-room"] })
      router.refresh()
    },
    onError: (e) => toast.error(publishError(e)),
  })
  return (
    <Button size={size} variant={variant} loading={publish.isPending} onClick={() => publish.mutate()}>
      <Rocket /> Publish
    </Button>
  )
}

export function DeletePropertyButton({
  id,
  title,
  status,
  redirectTo,
  withLabel,
}: {
  id: string
  title: string
  status: PropertyStatus
  /** Where to go after deleting (detail page); the list just refreshes. */
  redirectTo?: string
  withLabel?: boolean
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const remove = useMutation({
    meta: { silent: true },
    mutationFn: () => apiClient.delete(`/properties/${id}`),
    onSuccess: () => {
      toast.success(`${title} deleted`)
      if (redirectTo) router.push(redirectTo)
      router.refresh()
    },
    onError: (e) => setError(isApiError(e) ? e.userMessage : "Couldn't delete. Try again."),
  })

  return (
    <ConfirmDialog
      trigger={
        withLabel ? (
          <Button variant="destructive-soft" size="sm">
            <Trash2 /> Delete property
          </Button>
        ) : (
          <Button variant="ghost" size="icon-sm" aria-label={`Delete ${title}`}>
            <Trash2 />
          </Button>
        )
      }
      title={`Delete ${title}?`}
      description={
        status === "PUBLISHED"
          ? "Its rooms disappear from search immediately and it can't be restored from here. Existing leases are not affected."
          : "The draft and its rooms are removed. This can't be undone."
      }
      confirmLabel="Delete property"
      destructive
      pending={remove.isPending}
      onConfirm={async () => {
        setError(null)
        await remove.mutateAsync()
      }}
    >
      {error && <p className="text-sm text-destructive">{error}</p>}
    </ConfirmDialog>
  )
}
