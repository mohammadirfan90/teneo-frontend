"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { Ban, Flag, Plus, Send, Star } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { cn } from "cn"
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
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUrlState } from "@/hooks/use-url-state"
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import { formatDateTime } from "@/lib/format"
import type { MaintenanceCategory, MaintenancePriority, MaintenanceStatus } from "@/types/domain"
import { CATEGORY_LABEL, PRIORITY_HINT, PRIORITY_LABEL, TICKET_STATUS_LABEL } from "./labels"
import type { TicketUpdateView, TicketView } from "./types"

const ALL = "__all"

/** Page-level filters (URL `status`, `priority`). Needs <Suspense>. */
export function TicketFilters() {
  const { get, set, isPending } = useUrlState()
  return (
    <div className="grid gap-3 sm:flex sm:flex-wrap" aria-busy={isPending || undefined}>
      <Select value={get("status") || ALL} onValueChange={(v) => set({ status: v === ALL ? null : v })}>
        <SelectTrigger className="w-full sm:w-48" aria-label="Filter by status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {(Object.keys(TICKET_STATUS_LABEL) as MaintenanceStatus[]).map((s) => (
            <SelectItem key={s} value={s}>
              {TICKET_STATUS_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={get("priority") || ALL} onValueChange={(v) => set({ priority: v === ALL ? null : v })}>
        <SelectTrigger className="w-full sm:w-44" aria-label="Filter by priority">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Any priority</SelectItem>
          {(Object.keys(PRIORITY_LABEL) as MaintenancePriority[]).map((p) => (
            <SelectItem key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/* ------------------------------------------- create ------------------------------------------- */

// Mirrors B7A6 createTicketSchema (strict): title 1..120, description 1..4000, category, priority.
const createSchema = z.object({
  roomId: z.string().min(1, "Choose the room"),
  title: z.string().trim().min(5, "Use at least 5 characters").max(120, "Use at most 120 characters"),
  category: z.enum(
    ["PLUMBING", "ELECTRICAL", "APPLIANCE", "HVAC", "STRUCTURAL", "PEST", "OTHER"],
    "Pick a category"
  ),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  description: z
    .string()
    .trim()
    .min(10, "Describe the problem in at least 10 characters")
    .max(4000, "Keep it under 4,000 characters"),
})
type CreateValues = z.infer<typeof createSchema>

export interface RoomOption {
  roomId: string
  label: string
}

export function NewTicketDialog({
  rooms,
  triggerVariant = "default",
}: {
  rooms: RoomOption[]
  triggerVariant?: "default" | "outline"
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      roomId: rooms.length === 1 ? rooms[0].roomId : "",
      title: "",
      category: undefined,
      priority: "MEDIUM",
      description: "",
    },
  })

  const create = useMutation({
    meta: { silent: true },
    mutationFn: ({ roomId, ...body }: CreateValues) =>
      apiClient.post<TicketView>(`/rooms/${roomId}/tickets`, body),
    onSuccess: (t) => {
      setOpen(false)
      form.reset()
      toast.success("Request sent to your owner")
      router.push(`/dashboard/tickets/${t.id}`)
    },
    onError: (e) => {
      if (!isApiError(e)) return toast.error("Couldn't send the request. Try again.")
      const fields = e.fieldErrors()
      let mapped = false
      for (const k of ["title", "description", "category", "priority"] as const) {
        if (fields[k]) {
          form.setError(k, { message: fields[k] })
          mapped = true
        }
      }
      if (!mapped)
        toast.error(
          e.status === 403 ? "You can only report problems for a room on your active lease." : e.userMessage
        )
    },
  })

  if (rooms.length === 0) return null

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) form.reset()
      }}
    >
      <DialogTrigger asChild>
        <Button variant={triggerVariant}>
          <Plus /> Report a problem
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report a problem</DialogTitle>
          <DialogDescription>Your owner is notified and replies here.</DialogDescription>
        </DialogHeader>
        <form
          id="ticket-form"
          noValidate
          onSubmit={form.handleSubmit((v) => create.mutate(v))}
          className="grid gap-4"
        >
          {rooms.length > 1 && (
            <Controller
              control={form.control}
              name="roomId"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="ticket-room">Room</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="ticket-room"
                      className="w-full"
                      aria-invalid={fieldState.invalid || undefined}
                    >
                      <SelectValue placeholder="Choose the room" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map((r) => (
                        <SelectItem key={r.roomId} value={r.roomId}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          )}
          <TextField
            control={form.control}
            name="title"
            label="What's wrong?"
            placeholder="Bathroom tap is leaking"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="category"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="ticket-category">Category</FieldLabel>
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="ticket-category"
                      className="w-full"
                      aria-invalid={fieldState.invalid || undefined}
                    >
                      <SelectValue placeholder="Choose" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(CATEGORY_LABEL) as MaintenanceCategory[]).map((c) => (
                        <SelectItem key={c} value={c}>
                          {CATEGORY_LABEL[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="priority"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="ticket-priority">Urgency</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="ticket-priority" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PRIORITY_LABEL) as MaintenancePriority[]).map((p) => (
                        <SelectItem key={p} value={p}>
                          {PRIORITY_LABEL[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription>{PRIORITY_HINT[field.value]}</FieldDescription>
                </Field>
              )}
            />
          </div>
          <TextareaField
            control={form.control}
            name="description"
            label="Details"
            rows={5}
            placeholder="Where exactly, since when, and anything you've already tried."
          />
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form="ticket-form" loading={create.isPending}>
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------- detail ------------------------------------------- */

/**
 * Tenant-side transitions. The backend's per-role check is not enforced (backend-api.md §3),
 * so the UI only offers what a tenant is meant to do.
 */
function tenantMoves(status: MaintenanceStatus, isRaiser: boolean): Array<"CANCELLED" | "DISPUTED"> {
  switch (status) {
    case "OPEN":
      return isRaiser ? ["CANCELLED"] : []
    case "ACKNOWLEDGED":
      return isRaiser ? ["CANCELLED", "DISPUTED"] : ["DISPUTED"]
    case "IN_PROGRESS":
    case "RESOLVED":
      return ["DISPUTED"]
    default:
      return []
  }
}

const disputeSchema = z.object({
  comment: z
    .string()
    .trim()
    .min(10, "Explain what's still wrong in at least 10 characters")
    .max(4000, "Keep it under 4,000 characters"),
})
type DisputeValues = z.infer<typeof disputeSchema>

const commentSchema = z.object({
  body: z.string().trim().min(1, "Write a message").max(4000, "Keep it under 4,000 characters"),
})
type CommentValues = z.infer<typeof commentSchema>

const rateSchema = z.object({
  rating: z.number().int().min(1, "Choose 1 to 5 stars").max(5),
  comment: z.string().trim().max(1000, "Keep it under 1,000 characters"),
})
type RateValues = z.infer<typeof rateSchema>

interface Author {
  id: string
  name: string
}

/**
 * Status, actions and the conversation for one ticket. Status changes are optimistic:
 * the badge and available actions update at once and roll back if the API refuses.
 */
export function TicketWorkspace({
  ticket,
  updates,
  meId,
  ownerId,
}: {
  ticket: TicketView
  updates: TicketUpdateView[]
  meId: string
  ownerId: string | null
}) {
  const router = useRouter()
  const [status, setStatus] = useState<MaintenanceStatus>(ticket.status)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [disputeOpen, setDisputeOpen] = useState(false)
  const isRaiser = ticket.raisedByUserId === meId
  const moves = tenantMoves(status, isRaiser)
  const disputeForm = useForm<DisputeValues>({
    resolver: zodResolver(disputeSchema),
    defaultValues: { comment: "" },
  })
  const commentForm = useForm<CommentValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { body: "" },
  })
  const rateForm = useForm<RateValues>({
    resolver: zodResolver(rateSchema),
    defaultValues: { rating: 0, comment: "" },
  })

  const transition = useMutation({
    meta: { silent: true },
    mutationFn: (v: { toStatus: "CANCELLED" | "DISPUTED"; comment?: string }) =>
      apiClient.patch<TicketView>(`/tickets/${ticket.id}`, v),
    onMutate: (v) => {
      const previous = status
      setStatus(v.toStatus)
      setCancelOpen(false)
      setDisputeOpen(false)
      return { previous }
    },
    onSuccess: (t) => {
      setStatus(t.status)
      toast.success(t.status === "CANCELLED" ? "Request cancelled" : "Marked as disputed")
      disputeForm.reset()
      router.refresh()
    },
    onError: (e, _v, ctx) => {
      if (ctx) setStatus(ctx.previous)
      toast.error(
        isApiError(e) && e.status === 409
          ? "The request changed in the meantime, so that isn't possible any more."
          : isApiError(e)
            ? e.userMessage
            : "Couldn't update the request. Try again."
      )
      router.refresh()
    },
  })

  const comment = useMutation({
    meta: { silent: true },
    mutationFn: (v: CommentValues) => apiClient.post<TicketUpdateView>(`/tickets/${ticket.id}/updates`, v),
    onSuccess: () => {
      commentForm.reset()
      toast.success("Message sent")
      router.refresh()
    },
    onError: (e) => {
      const msg = isApiError(e) ? (e.fieldErrors().body ?? e.userMessage) : "Couldn't send. Try again."
      commentForm.setError("body", { message: msg })
    },
  })

  const rate = useMutation({
    meta: { silent: true },
    mutationFn: (v: RateValues) =>
      apiClient.post<TicketView>(`/tickets/${ticket.id}/rate`, {
        rating: v.rating,
        ...(v.comment ? { comment: v.comment } : {}),
      }),
    onSuccess: () => {
      toast.success("Thanks for the rating")
      router.refresh()
    },
    onError: (e) => {
      if (isApiError(e) && e.status === 409) toast.error("You've already rated this request.")
      else if (isApiError(e) && e.status === 422) toast.error("You can rate once the request is resolved.")
      else toast.error(isApiError(e) ? e.userMessage : "Couldn't save the rating. Try again.")
      router.refresh()
    },
  })

  const authorOf = (id: string): Author =>
    id === meId ? { id, name: "You" } : id === ownerId ? { id, name: "Owner" } : { id, name: "Teneo support" }
  // The first update repeats the description; show it as the original report instead.
  const thread = updates.length && updates[0].body === ticket.description ? updates.slice(1) : updates
  const closed = status === "CLOSED" || status === "CANCELLED"
  const canRate = isRaiser && status === "RESOLVED" && ticket.rating === null

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-labelledby="ticket-status"
        className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="ticket-status" className="flex items-center gap-2 font-semibold">
            Status <StatusBadge status={status} label={TICKET_STATUS_LABEL[status]} />
          </h2>
          {moves.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {moves.includes("CANCELLED") && (
                <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Ban /> Cancel request
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cancel this request?</DialogTitle>
                      <DialogDescription>
                        Use this if the problem fixed itself or you reported it by mistake. It can&apos;t be
                        reopened.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setCancelOpen(false)}>
                        Keep it open
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => transition.mutate({ toStatus: "CANCELLED" })}
                      >
                        Cancel request
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              {moves.includes("DISPUTED") && (
                <Dialog
                  open={disputeOpen}
                  onOpenChange={(o) => {
                    setDisputeOpen(o)
                    if (!o) disputeForm.reset()
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Flag /> {status === "RESOLVED" ? "Not fixed" : "Dispute"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {status === "RESOLVED" ? "Problem not fixed?" : "Dispute this request"}
                      </DialogTitle>
                      <DialogDescription>
                        Tell the owner what&apos;s still wrong. The request is flagged until they resolve it
                        again.
                      </DialogDescription>
                    </DialogHeader>
                    <form
                      id="dispute-form"
                      noValidate
                      onSubmit={disputeForm.handleSubmit((v) =>
                        transition.mutate({ toStatus: "DISPUTED", comment: v.comment })
                      )}
                    >
                      <TextareaField
                        control={disputeForm.control}
                        name="comment"
                        label="What's still wrong?"
                        rows={4}
                        placeholder="The tap still drips overnight."
                      />
                    </form>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setDisputeOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" form="dispute-form">
                        Send dispute
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}
        </div>
        {status === "DISPUTED" && (
          <p className="text-sm text-muted-foreground">
            You disputed this. The owner needs to resolve it again.
          </p>
        )}
        {status === "RESOLVED" && !canRate && ticket.rating === null && (
          <p className="text-sm text-muted-foreground">The owner marked this as fixed.</p>
        )}
      </section>

      {canRate && (
        <section aria-labelledby="rate-heading" className="rounded-xl border bg-card p-4 sm:p-5">
          <h2 id="rate-heading" className="font-semibold">
            How did it go?
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Rate the repair. Your owner sees the rating.</p>
          <form
            noValidate
            onSubmit={rateForm.handleSubmit((v) => rate.mutate(v))}
            className="mt-4 flex flex-col gap-4"
          >
            <Controller
              control={rateForm.control}
              name="rating"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel id="rating-label">Rating</FieldLabel>
                  <div role="radiogroup" aria-labelledby="rating-label" className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={field.value === n}
                        aria-label={`${n} star${n > 1 ? "s" : ""}`}
                        onClick={() => field.onChange(n)}
                        className="grid size-11 place-items-center rounded-md hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
                      >
                        <Star
                          className={cn("size-6", n <= field.value ? "fill-clay text-clay" : "text-subtle")}
                          aria-hidden
                        />
                      </button>
                    ))}
                  </div>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <TextareaField control={rateForm.control} name="comment" label="Comment (optional)" rows={3} />
            <div>
              <Button type="submit" loading={rate.isPending}>
                Submit rating
              </Button>
            </div>
          </form>
        </section>
      )}

      <section aria-labelledby="thread-heading" className="rounded-xl border bg-card p-4 sm:p-5">
        <h2 id="thread-heading" className="font-semibold">
          Conversation
        </h2>
        {thread.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No replies yet. Your owner&apos;s response will show here.
          </p>
        ) : (
          <ol className="mt-4 flex flex-col gap-4">
            {thread.map((u) => {
              const a = authorOf(u.authorUserId)
              const mine = a.id === meId
              return (
                <li key={u.id} className={cn("flex flex-col gap-1", mine && "items-end")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-xl px-4 py-2.5 text-[0.9375rem] whitespace-pre-line",
                      mine ? "bg-primary/10" : "bg-surface-2"
                    )}
                  >
                    {u.body}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {a.name} · <time dateTime={u.createdAt}>{formatDateTime(u.createdAt)}</time>
                    {u.statusAfter && <> · marked {TICKET_STATUS_LABEL[u.statusAfter].toLowerCase()}</>}
                  </p>
                </li>
              )
            })}
          </ol>
        )}

        {!closed && (
          <form
            noValidate
            onSubmit={commentForm.handleSubmit((v) => comment.mutate(v))}
            className="mt-5 flex flex-col gap-3 border-t pt-4"
          >
            <TextareaField
              control={commentForm.control}
              name="body"
              label="Add a message"
              rows={3}
              placeholder="The plumber can come any weekday after 5pm."
            />
            <div className="flex justify-end">
              <Button type="submit" loading={comment.isPending}>
                <Send /> Send
              </Button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
