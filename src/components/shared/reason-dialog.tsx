"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle } from "lucide-react"
import { useMemo, useState, type ReactNode } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { TextField, TextareaField } from "@/components/shared/form-fields"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { isApiError } from "@/lib/api/errors"

interface ReasonDialogProps {
  /** The button that opens the dialog. */
  trigger: ReactNode
  title: string
  description?: ReactNode
  confirmLabel: string
  destructive?: boolean
  /** Text field for the reason/notes. `null` hides it (pure confirmation). */
  reason?: { label: string; placeholder?: string; max: number; description?: ReactNode } | null
  /** When set, the user must type this exact value to enable the action (irreversible operations). */
  confirmText?: string
  /** Runs the mutation. Throw to keep the dialog open; the error is shown inline. */
  onConfirm: (reason: string) => Promise<unknown>
  /** Map an error to an inline message (default: ApiError.userMessage). */
  describeError?: (error: unknown) => string
}

/**
 * Confirmation dialog for staff actions that need a written reason (takedown, waive, refund,
 * KYC notes) or a typed confirmation (deactivate). Validation mirrors the backend limits.
 */
export function ReasonDialog({
  trigger,
  title,
  description,
  confirmLabel,
  destructive,
  reason = { label: "Reason", max: 1000 },
  confirmText,
  onConfirm,
  describeError,
}: ReasonDialogProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const schema = useMemo(
    () =>
      z.object({
        reason: reason
          ? z
              .string()
              .max(reason.max, `Keep it under ${reason.max.toLocaleString("en-US")} characters`)
              .pipe(z.string().trim().min(1, "Write a short reason"))
          : z.string(),
        confirm: confirmText
          ? z.string().refine((v) => v.trim() === confirmText, "This doesn't match")
          : z.string(),
      }),
    [reason, confirmText]
  )
  type Values = z.infer<typeof schema>

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { reason: "", confirm: "" },
    mode: "onTouched",
  })

  const submit = form.handleSubmit(async (v) => {
    setError(null)
    try {
      await onConfirm(v.reason.trim())
      setOpen(false)
      form.reset()
    } catch (e) {
      setError(
        describeError?.(e) ?? (isApiError(e) ? e.userMessage : "Something went wrong. Please try again.")
      )
    }
  })

  const formId = `reason-${title.replace(/\W+/g, "-").toLowerCase()}`

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (form.formState.isSubmitting) return
        setOpen(o)
        if (!o) {
          setError(null)
          form.reset()
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form id={formId} onSubmit={submit} noValidate className="grid gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {reason && (
            <TextareaField
              control={form.control}
              name="reason"
              label={reason.label}
              placeholder={reason.placeholder}
              description={reason.description}
              rows={4}
              maxLength={reason.max}
            />
          )}
          {confirmText && (
            <TextField
              control={form.control}
              name="confirm"
              label={
                <>
                  Type <span className="font-mono font-medium break-all">{confirmText}</span> to confirm
                </>
              }
              autoComplete="off"
              spellCheck={false}
            />
          )}
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={form.formState.isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            variant={destructive ? "destructive" : "default"}
            loading={form.formState.isSubmitting}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
