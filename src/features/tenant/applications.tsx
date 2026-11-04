"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { Check, Circle, CircleDot, CircleSlash, Undo2, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { cn } from "cn"
import { z } from "zod"

import { TextareaField } from "@/components/shared/form-fields"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUrlState } from "@/hooks/use-url-state"
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import { formatDate } from "@/lib/format"
import type { ApplicationStatus, ApplicationView } from "@/types/domain"
import { APPLICATION_STATUS_LABEL } from "./labels"

const ALL = "__all"

/** Page-level filter bar for /dashboard/applications (URL `status`). Needs <Suspense>. */
export function ApplicationFilters() {
  const { get, set, isPending } = useUrlState()
  return (
    <div className="flex flex-wrap items-center gap-3" aria-busy={isPending || undefined}>
      <Select value={get("status") || ALL} onValueChange={(v) => set({ status: v === ALL ? null : v })}>
        <SelectTrigger className="w-full sm:w-56" aria-label="Filter by status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {(Object.keys(APPLICATION_STATUS_LABEL) as ApplicationStatus[]).map((s) => (
            <SelectItem key={s} value={s}>
              {APPLICATION_STATUS_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/* -------------------------------------------- timeline -------------------------------------------- */

const FLOW: Array<{ status: ApplicationStatus; title: string; body: string; optional?: boolean }> = [
  { status: "SUBMITTED", title: "Application sent", body: "The owner has your application and message." },
  { status: "SCREENING", title: "Screening", body: "The owner is reviewing your profile." },
  {
    status: "VIEWING_SCHEDULED",
    title: "Viewing",
    body: "A visit to the room is arranged. Owners can skip this step.",
    optional: true,
  },
  { status: "SHORTLISTED", title: "Shortlisted", body: "You're on the owner's final list." },
  { status: "APPROVED", title: "Approved", body: "The room is reserved for you and a draft lease is ready." },
]

const TERMINAL: Partial<Record<ApplicationStatus, { title: string; body: string }>> = {
  REJECTED: { title: "Not selected", body: "The owner chose another applicant or declined this one." },
  WITHDRAWN: { title: "Withdrawn", body: "You withdrew this application." },
  CANCELLED: { title: "Cancelled", body: "The application was cancelled after the viewing stage." },
}

const WITHDRAWABLE: ApplicationStatus[] = ["SUBMITTED", "SCREENING", "VIEWING_SCHEDULED"]

type StepState = "done" | "current" | "upcoming" | "stopped"

/**
 * Progress through the application state machine. The API exposes only the current
 * status plus submitted/decided dates, so earlier steps show as done without dates.
 */
function Timeline({ app, status }: { app: ApplicationView; status: ApplicationStatus }) {
  const terminal = TERMINAL[status]
  const at = FLOW.findIndex((s) => s.status === status)

  const steps: Array<{ key: string; title: string; body: string; state: StepState; date?: string }> = terminal
    ? [
        { key: "SUBMITTED", title: FLOW[0].title, body: FLOW[0].body, state: "done", date: app.submittedAt },
        {
          key: status,
          title: terminal.title,
          body: terminal.body,
          state: "stopped",
          date: app.decidedAt ?? app.updatedAt,
        },
      ]
    : FLOW.map((s, i) => ({
        key: s.status,
        title: s.optional && i < at ? `${s.title} (if arranged)` : s.title,
        body: s.body,
        state: i < at || (i === at && status === "APPROVED") ? "done" : i === at ? "current" : "upcoming",
        date:
          i === 0
            ? app.submittedAt
            : s.status === "APPROVED" && status === "APPROVED"
              ? (app.decidedAt ?? undefined)
              : i === at
                ? app.updatedAt
                : undefined,
      }))

  return (
    <ol className="flex flex-col" aria-label="Application progress">
      {steps.map((s, i) => {
        const last = i === steps.length - 1
        return (
          <li
            key={s.key}
            className="relative flex gap-3 pb-6 last:pb-0"
            aria-current={s.state === "current" ? "step" : undefined}
          >
            {!last && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-7 bottom-1 left-[13px] w-px",
                  s.state === "done" ? "bg-primary/40" : "bg-border"
                )}
              />
            )}
            <span
              aria-hidden
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full border",
                s.state === "done" && "border-primary/30 bg-primary/10 text-primary",
                s.state === "current" && "border-info/40 bg-info-soft text-info",
                s.state === "upcoming" && "bg-card text-subtle",
                s.state === "stopped" &&
                  (status === "REJECTED"
                    ? "border-destructive/30 bg-danger-soft text-destructive"
                    : "bg-surface-2 text-muted-foreground")
              )}
            >
              {s.state === "done" ? (
                <Check className="size-3.5" />
              ) : s.state === "current" ? (
                <CircleDot className="size-3.5" />
              ) : s.state === "stopped" ? (
                status === "REJECTED" ? (
                  <X className="size-3.5" />
                ) : (
                  <CircleSlash className="size-3.5" />
                )
              ) : (
                <Circle className="size-3" />
              )}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className={cn("font-medium", s.state === "upcoming" && "text-muted-foreground")}>
                {s.title}
                <span className="sr-only">
                  {" "}
                  ({s.state === "done" ? "done" : s.state === "current" ? "current step" : s.state})
                </span>
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">{s.body}</p>
              {s.date && (
                <p className="mt-1 text-xs text-subtle tabular-nums">
                  {s.state === "current" ? "Updated " : ""}
                  {formatDate(s.date)}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/* ------------------------------------------- status panel ------------------------------------------ */

const withdrawSchema = z.object({
  reason: z.string().trim().max(500, "Keep it under 500 characters"),
})
type WithdrawValues = z.infer<typeof withdrawSchema>

/** Status, timeline and withdraw (optimistic: the status flips at once, rolls back on error). */
export function ApplicationStatusPanel({ app }: { app: ApplicationView }) {
  const router = useRouter()
  const [status, setStatus] = useState<ApplicationStatus>(app.status)
  const [open, setOpen] = useState(false)
  const form = useForm<WithdrawValues>({
    resolver: zodResolver(withdrawSchema),
    defaultValues: { reason: "" },
  })

  const withdraw = useMutation({
    meta: { silent: true },
    mutationFn: (v: WithdrawValues) =>
      apiClient.post<ApplicationView>(
        `/applications/${app.id}/withdraw`,
        v.reason ? { reason: v.reason } : {}
      ),
    onMutate: () => {
      const previous = status
      setStatus("WITHDRAWN")
      setOpen(false)
      return { previous }
    },
    onSuccess: (updated) => {
      setStatus(updated.status)
      toast.success("Application withdrawn")
      router.refresh()
    },
    onError: (e, _v, ctx) => {
      if (ctx) setStatus(ctx.previous)
      toast.error(
        isApiError(e) && e.status === 409
          ? "This application can no longer be withdrawn. The owner may have just moved it forward."
          : isApiError(e)
            ? e.userMessage
            : "Couldn't withdraw. Try again."
      )
      router.refresh()
    },
  })

  return (
    <section aria-labelledby="status-heading" className="rounded-xl border bg-card p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 id="status-heading" className="text-lg font-semibold">
          Progress
        </h2>
        <StatusBadge status={status} label={APPLICATION_STATUS_LABEL[status]} />
      </div>

      <Timeline app={app} status={status} />

      {WITHDRAWABLE.includes(status) && (
        <div className="mt-6 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Changed your mind? You can withdraw until the owner shortlists you.
          </p>
          <Dialog
            open={open}
            onOpenChange={(o) => {
              setOpen(o)
              if (!o) form.reset()
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="shrink-0">
                <Undo2 /> Withdraw application
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Withdraw this application?</DialogTitle>
                <DialogDescription>
                  The owner will see that you withdrew. To be considered again you&apos;d need to apply again.
                </DialogDescription>
              </DialogHeader>
              <form
                id="withdraw-form"
                noValidate
                onSubmit={form.handleSubmit((v) => withdraw.mutate(v))}
                className="grid gap-4"
              >
                <TextareaField
                  control={form.control}
                  name="reason"
                  label="Reason (optional)"
                  rows={3}
                  placeholder="Found another place closer to work."
                />
              </form>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Keep application
                </Button>
                <Button type="submit" form="withdraw-form" variant="destructive">
                  Withdraw
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </section>
  )
}
