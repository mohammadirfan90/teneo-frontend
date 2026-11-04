"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { ArrowRight, MessageSquarePlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { TextareaField } from "@/components/shared/form-fields"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { TICKET_ACTION_LABEL, TICKET_OWNER_NEXT } from "@/features/owner/labels"
import type { TicketUpdateView, TicketView } from "@/features/owner/types"
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import { humanize } from "@/lib/format"
import type { MaintenanceStatus } from "@/types/domain"

/**
 * Status card with the single next owner move. The status flips immediately
 * (optimistic) and rolls back if the server refuses.
 */
export function TicketStatusControl({
  ticketId,
  status: initial,
}: {
  ticketId: string
  status: MaintenanceStatus
}) {
  const router = useRouter()
  const [status, setStatus] = useState(initial)
  const [comment, setComment] = useState("")
  const next = TICKET_OWNER_NEXT[status]

  const transition = useMutation({
    mutationFn: (to: MaintenanceStatus) =>
      apiClient.patch<TicketView>(`/tickets/${ticketId}`, {
        toStatus: to,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      }),
    onMutate: (to) => {
      const previous = status
      setStatus(to)
      return { previous }
    },
    onError: (_e, _to, ctx) => {
      if (ctx) setStatus(ctx.previous)
    },
    onSuccess: (t) => {
      setStatus(t.status)
      setComment("")
      toast.success(`Ticket ${humanize(t.status).toLowerCase()}`)
      router.refresh()
    },
  })

  const tooLong = comment.trim().length > 4000

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">Status</span>
        <StatusBadge status={status} />
      </div>
      {next ? (
        <form
          className="flex flex-col gap-3 border-t pt-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!tooLong) transition.mutate(next)
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="transition-comment">Note for the tenant</Label>
            <Textarea
              id="transition-comment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                next === "RESOLVED"
                  ? "What was fixed?"
                  : next === "IN_PROGRESS"
                    ? "Who's coming, and when?"
                    : "Optional"
              }
              aria-invalid={tooLong || undefined}
            />
            <p className={tooLong ? "text-[0.8125rem] text-destructive" : "text-[0.8125rem] text-subtle"}>
              {tooLong
                ? "Keep it under 4,000 characters"
                : "Optional · posted to the thread with the status change"}
            </p>
          </div>
          <Button type="submit" loading={transition.isPending}>
            {TICKET_ACTION_LABEL[next] ?? humanize(next)} <ArrowRight />
          </Button>
        </form>
      ) : (
        <p className="border-t pt-4 text-sm text-muted-foreground">
          {status === "CANCELLED"
            ? "The tenant cancelled this request. No further actions."
            : "This ticket is closed. No further actions."}
        </p>
      )}
    </div>
  )
}

const commentSchema = z.object({
  body: z.string().trim().min(1, "Write a message").max(4000, "Keep it under 4,000 characters"),
})
type CommentValues = z.infer<typeof commentSchema>

export function TicketCommentForm({ ticketId }: { ticketId: string }) {
  const router = useRouter()
  const form = useForm<CommentValues>({ resolver: zodResolver(commentSchema), defaultValues: { body: "" } })

  const post = useMutation({
    meta: { silent: true },
    mutationFn: (v: CommentValues) =>
      apiClient.post<TicketUpdateView>(`/tickets/${ticketId}/updates`, { body: v.body }),
    onSuccess: () => {
      form.reset()
      toast.success("Message posted")
      router.refresh()
    },
    onError: (e) => {
      const fields = isApiError(e) ? e.fieldErrors() : {}
      form.setError("body", {
        message: fields.body ?? (isApiError(e) ? e.userMessage : "Couldn't post your message. Try again."),
      })
    },
  })

  return (
    <form onSubmit={form.handleSubmit((v) => post.mutate(v))} noValidate className="flex flex-col gap-3">
      <TextareaField
        control={form.control}
        name="body"
        label="Reply"
        rows={3}
        placeholder="Write to the tenant…"
      />
      <div className="flex justify-end">
        <Button type="submit" variant="outline" loading={post.isPending}>
          <MessageSquarePlus /> Post reply
        </Button>
      </div>
    </form>
  )
}
