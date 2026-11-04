"use client"

import { useMutation } from "@tanstack/react-query"
import { UserX } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { ReasonDialog } from "@/components/shared/reason-dialog"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import type { UserDetailView } from "./types"

export function DeactivateUser({ userId, email }: { userId: string; email: string }) {
  const router = useRouter()
  const deactivate = useMutation({
    meta: { silent: true },
    mutationFn: () => apiClient.post<UserDetailView>(`/admin/users/${userId}/deactivate`, {}),
    onSuccess: () => {
      toast.success("Account deactivated", { description: "They've been signed out on every device." })
      router.refresh()
    },
  })

  return (
    <ReasonDialog
      trigger={
        <Button variant="destructive-soft">
          <UserX /> Deactivate account
        </Button>
      }
      title="Deactivate this account?"
      description="This can't be undone. The email is replaced with an anonymous address, the phone number and password are removed, and every session is signed out."
      confirmLabel="Deactivate"
      destructive
      reason={null}
      confirmText={email}
      onConfirm={() => deactivate.mutateAsync()}
      describeError={(e) => {
        if (!isApiError(e)) return "Couldn't reach the server. Try again."
        if (e.status === 422) return "You can't deactivate your own account."
        if (e.status === 404) return "This account is already deactivated or no longer exists."
        return e.userMessage
      }}
    />
  )
}
