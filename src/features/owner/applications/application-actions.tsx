"use client"

import { useMutation } from "@tanstack/react-query"
import { ArrowRight, Ban, Check, ListChecks, Search, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type ReactNode } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button, type ButtonProps } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import type { ApplicationStatus, ApplicationView, ViewingView } from "@/types/domain"
import { APPLICATION_ACTION_LABEL, APPLICATION_OWNER_NEXT } from "../labels"
import { useLocalRecords, useMounted } from "../local-records"
import { ProposeViewingDialog } from "./propose-viewing"
import { NoLocalViewingNote, ViewingPanel } from "./viewing-panel"

const NO_VIEWINGS: ViewingView[] = []

const ICON: Partial<Record<ApplicationStatus, ReactNode>> = {
  SCREENING: <Search />,
  SHORTLISTED: <ListChecks />,
  APPROVED: <Check />,
  REJECTED: <X />,
  CANCELLED: <Ban />,
}

const CONFIRM: Partial<
  Record<ApplicationStatus, { title: string; body: string; label: string; destructive?: boolean }>
> = {
  APPROVED: {
    title: "Approve this applicant?",
    body: "The room is reserved for them, every other open application on this room is rejected, and a draft lease is created for both of you to sign.",
    label: "Approve and draft lease",
  },
  REJECTED: {
    title: "Reject this application?",
    body: "The applicant is told their application wasn't successful. This can't be undone.",
    label: "Reject application",
    destructive: true,
  },
  CANCELLED: {
    title: "Cancel this application?",
    body: "Use this when the viewing fell through and the application shouldn't continue. This can't be undone.",
    label: "Cancel application",
    destructive: true,
  },
}

const HINT: Partial<Record<ApplicationStatus, string>> = {
  SUBMITTED: "Start screening to show the applicant you're looking at it, or reject it.",
  SCREENING: "Offer viewing times, or shortlist the applicant straight away.",
  VIEWING_SCHEDULED: "After the viewing, shortlist or reject the applicant.",
  SHORTLISTED: "Approving reserves the room and drafts a lease.",
  APPROVED: "A draft lease was created. Sign it, then the tenant signs and confirms move-in.",
  REJECTED: "This application is closed.",
  WITHDRAWN: "The applicant withdrew. This application is closed.",
  CANCELLED: "This application is closed.",
}

function transitionError(e: unknown): string {
  if (!isApiError(e)) return "Couldn't update the application."
  if (e.status === 409)
    return e.message.includes("RESERVED") || e.message.toLowerCase().includes("reserved")
      ? "This room is already reserved for another applicant."
      : "The application changed in the meantime. Refresh and try again."
  return e.userMessage
}

/** Decision panel with optimistic status changes and viewing management. */
export function ApplicationActions({
  application,
  leaseId,
}: {
  application: ApplicationView
  leaseId: string | null
}) {
  const router = useRouter()
  const mounted = useMounted()
  const [status, setStatus] = useState<ApplicationStatus>(application.status)
  const viewings = useLocalRecords((s) => s.viewings[application.id] ?? NO_VIEWINGS)
  const saveViewing = useLocalRecords((s) => s.saveViewing)

  const transition = useMutation({
    meta: { silent: true },
    mutationFn: (to: ApplicationStatus) =>
      apiClient.post<ApplicationView>(`/applications/${application.id}/transition`, { to }),
    onMutate: (to) => {
      const previous = status
      setStatus(to) // optimistic
      return { previous }
    },
    onError: (e, _to, ctx) => {
      if (ctx) setStatus(ctx.previous)
      toast.error(transitionError(e))
    },
    onSuccess: (app) => {
      setStatus(app.status)
      toast.success(
        app.status === "APPROVED"
          ? "Applicant approved"
          : `Application moved to ${app.status.toLowerCase().replace(/_/g, " ")}`,
        app.status === "APPROVED" ? { description: "A draft lease is ready for signatures." } : undefined
      )
      router.refresh()
    },
  })

  const next = APPLICATION_OWNER_NEXT[status] ?? []
  const primary = next.find((s) => s !== "REJECTED" && s !== "CANCELLED")
  const secondary = next.filter((s) => s !== primary)
  const latestViewing = mounted ? viewings[0] : undefined

  const actionButton = (to: ApplicationStatus, variant: ButtonProps["variant"], full = true) => {
    const confirm = CONFIRM[to]
    const label = APPLICATION_ACTION_LABEL[to] ?? to
    const button = (
      <Button
        variant={variant}
        className={full ? "w-full" : undefined}
        loading={transition.isPending && transition.variables === to}
        disabled={transition.isPending}
        onClick={confirm ? undefined : () => transition.mutate(to)}
      >
        {ICON[to]} {label}
      </Button>
    )
    if (!confirm) return <div key={to}>{button}</div>
    return (
      <ConfirmDialog
        key={to}
        trigger={button}
        title={confirm.title}
        description={confirm.body}
        confirmLabel={confirm.label}
        destructive={confirm.destructive}
        pending={transition.isPending}
        onConfirm={() => transition.mutateAsync(to)}
      />
    )
  }

  return (
    <section aria-labelledby="decision" className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 id="decision" className="font-semibold">
          Decision
        </h2>
        <StatusBadge status={status} />
      </div>
      <p className="text-sm text-muted-foreground">{HINT[status]}</p>

      {(primary || secondary.length > 0 || status === "SCREENING") && (
        <div className="flex flex-col gap-2">
          {primary && actionButton(primary, "default")}
          {status === "SCREENING" && (
            <ProposeViewingDialog
              applicationId={application.id}
              tenantName={application.tenant.displayName}
              onProposed={(v) => {
                saveViewing(application.id, v)
                setStatus("VIEWING_SCHEDULED")
                toast.success("Viewing times sent", { description: "Confirm one once you've agreed a time." })
                router.refresh()
              }}
            />
          )}
          {secondary.map((s) => actionButton(s, s === "REJECTED" ? "destructive-soft" : "ghost"))}
        </div>
      )}

      {latestViewing ? (
        <ViewingPanel applicationId={application.id} viewing={latestViewing} />
      ) : (
        mounted && status === "VIEWING_SCHEDULED" && <NoLocalViewingNote />
      )}

      {status === "APPROVED" && (
        <Button asChild variant="outline">
          <Link href={leaseId ? `/owner/leases/${leaseId}` : "/owner/leases"}>
            {leaseId ? "Open the draft lease" : "Go to leases"} <ArrowRight />
          </Link>
        </Button>
      )}
    </section>
  )
}
