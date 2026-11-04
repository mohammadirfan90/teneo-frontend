"use client"

import { useMutation } from "@tanstack/react-query"
import { ArrowRight, BadgeCheck, Flag, MessageSquareMore } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { DataTable } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ROLE_LABEL } from "@/lib/auth/roles"
import { formatDateTime } from "@/lib/format"
import type { KycSubmissionView } from "@/types/domain"
import { KYC_SUCCESS, KycActionButtons, kycErrorMessage, sendKycAction } from "./kyc-actions"

export interface QueueItem extends KycSubmissionView {
  applicantName: string | null
}

/**
 * Pending submissions with inline approve/reject. A decision removes the row immediately and
 * restores it if the server refuses. "Request info" lives on the review page.
 */
export function KycQueue({ items }: { items: QueueItem[] }) {
  const router = useRouter()
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set())

  const mutation = useMutation({
    meta: { silent: true },
    mutationFn: sendKycAction,
    // Optimistic: the row leaves the queue now and comes back if the server refuses.
    onMutate: ({ id }) => setHidden((s) => new Set(s).add(id)),
    onError: (e, { id }) => {
      setHidden((s) => {
        const next = new Set(s)
        next.delete(id)
        return next
      })
      toast.error("The decision wasn't saved", { description: kycErrorMessage(e) })
    },
    onSuccess: (_, { action }) => {
      toast.success(KYC_SUCCESS[action])
      router.refresh()
    },
  })

  const visible = items.filter((s) => !hidden.has(s.id))

  if (visible.length === 0) {
    return (
      <EmptyState
        icon={BadgeCheck}
        title="Nothing waiting for review"
        description="New identity submissions from tenants and owners land here. Only pending submissions are listed; the backend has no history of decided ones."
      />
    )
  }

  return (
    <DataTable
      caption="Pending KYC submissions"
      rows={visible}
      rowKey={(s) => s.id}
      mobileAside={(s) =>
        s.flaggedForReview ? (
          <Badge variant="danger">
            <Flag /> Flagged
          </Badge>
        ) : null
      }
      columns={[
        {
          key: "applicant",
          header: "Applicant",
          cell: (s) => {
            const note = s.reviewNotes
            return (
              <div className="min-w-0">
                <Link href={`/admin/kyc/${s.id}`} className="font-medium underline-offset-4 hover:underline">
                  {s.applicantName ?? "Unknown applicant"}
                </Link>
                {note && (
                  <p className="mt-0.5 flex items-center gap-1 text-[0.8125rem] text-muted-foreground">
                    <MessageSquareMore className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">Info requested: {note}</span>
                  </p>
                )}
              </div>
            )
          },
        },
        { key: "role", header: "Verifying as", cell: (s) => ROLE_LABEL[s.role] },
        {
          key: "flag",
          header: "Document check",
          cell: (s) =>
            s.flaggedForReview ? (
              <Badge variant="danger">
                <Flag /> Reused document
              </Badge>
            ) : (
              <span className="text-muted-foreground">No match</span>
            ),
          hideOnMobile: true,
        },
        {
          key: "docs",
          header: "Files",
          cell: (s) => s.documentObjectKeys.length,
          align: "right",
        },
        { key: "submitted", header: "Submitted", cell: (s) => formatDateTime(s.createdAt) },
      ]}
      actions={(s) => (
        <div className="flex flex-wrap items-center gap-2 md:flex-nowrap md:justify-end">
          <KycActionButtons
            size="sm"
            withInfo={false}
            applicant={s.applicantName ?? "this applicant"}
            run={(action, text) => {
              mutation.mutate({ id: s.id, action, notes: text })
              return Promise.resolve()
            }}
          />
          <Button size="sm" variant="ghost" asChild>
            <Link href={`/admin/kyc/${s.id}`}>
              Review <ArrowRight />
            </Link>
          </Button>
        </div>
      )}
    />
  )
}
