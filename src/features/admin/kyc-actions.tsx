"use client"

import { useMutation } from "@tanstack/react-query"
import { Check, MessageSquareMore, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { ReasonDialog } from "@/components/shared/reason-dialog"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import type { KycSubmissionView } from "@/types/domain"

export type KycAction = "APPROVED" | "REJECTED" | "INFO"

export interface KycActionVars {
  id: string
  action: KycAction
  notes: string
}

/** POST the decision or the info request. Backend: notes 1..2000; non-PENDING → 409. */
export function sendKycAction({ id, action, notes }: KycActionVars) {
  return action === "INFO"
    ? apiClient.post<KycSubmissionView>(`/kyc/submissions/${id}/request-info`, { notes })
    : apiClient.post<KycSubmissionView>(`/kyc/submissions/${id}/decision`, { decision: action, notes })
}

export function kycErrorMessage(e: unknown): string {
  if (!isApiError(e)) return "Couldn't reach the server. Try again."
  if (e.status === 409) return "Another admin already decided this submission."
  if (e.status === 404) return "This submission no longer exists."
  return e.userMessage
}

export const KYC_SUCCESS: Record<KycAction, string> = {
  APPROVED: "Verification approved",
  REJECTED: "Verification rejected",
  INFO: "More information requested",
}

const NOTES = { max: 2000 }

/**
 * The three reviewer actions. `run` decides how the mutation is applied: the queue fires it
 * optimistically and resolves at once; the review page awaits it so errors show in the dialog.
 */
export function KycActionButtons({
  applicant,
  run,
  size = "default",
  withInfo = true,
}: {
  applicant: string
  run: (action: KycAction, notes: string) => Promise<unknown>
  size?: "default" | "sm"
  /** The queue omits "request info" to keep rows to one line; the review page has it. */
  withInfo?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <ReasonDialog
        trigger={
          <Button size={size}>
            <Check /> Approve
          </Button>
        }
        title={`Approve ${applicant}?`}
        description="They can publish listings or apply for rooms straight away. Approval lasts about two years."
        confirmLabel="Approve"
        reason={{ ...NOTES, label: "Reviewer notes", placeholder: "ID matches the profile name and photo." }}
        onConfirm={(notes) => run("APPROVED", notes)}
        describeError={kycErrorMessage}
      />
      <ReasonDialog
        trigger={
          <Button size={size} variant="destructive-soft">
            <X /> Reject
          </Button>
        }
        title={`Reject ${applicant}'s submission?`}
        description="They'll see your notes and can submit new documents."
        confirmLabel="Reject"
        destructive
        reason={{ ...NOTES, label: "Reason shown to the applicant", placeholder: "The ID photo is blurred." }}
        onConfirm={(notes) => run("REJECTED", notes)}
        describeError={kycErrorMessage}
      />
      {withInfo && (
        <ReasonDialog
          trigger={
            <Button size={size} variant="outline">
              <MessageSquareMore /> Request info
            </Button>
          }
          title="Ask for more information"
          description="The submission stays in the queue as pending, with your note attached."
          confirmLabel="Send request"
          reason={{
            ...NOTES,
            label: "What do you need?",
            placeholder: "Please upload the back of the ID card too.",
          }}
          onConfirm={(notes) => run("INFO", notes)}
          describeError={kycErrorMessage}
        />
      )}
    </div>
  )
}

/** Review page variant: waits for the server, then returns to the queue. */
export function KycReviewActions({ id, applicant }: { id: string; applicant: string }) {
  const router = useRouter()
  const mutation = useMutation({
    meta: { silent: true },
    mutationFn: sendKycAction,
    onSuccess: (_, vars) => {
      toast.success(KYC_SUCCESS[vars.action])
      if (vars.action === "INFO") router.refresh()
      else router.push("/admin/kyc")
    },
  })
  return (
    <KycActionButtons
      applicant={applicant}
      run={(action, notes) => mutation.mutateAsync({ id, action, notes })}
    />
  )
}
