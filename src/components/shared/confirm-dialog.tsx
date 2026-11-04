"use client"

import { useState, type ReactNode } from "react"

import { Button, type ButtonProps } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface ConfirmDialogProps {
  /** The element that opens the dialog (usually a Button). */
  trigger: ReactNode
  title: string
  description?: ReactNode
  confirmLabel: string
  /** Red confirm button for irreversible actions. */
  destructive?: boolean
  /** Resolve to close, throw/reject to keep the dialog open (the caller shows the error). */
  onConfirm: () => Promise<unknown> | void
  pending?: boolean
  /** Extra content such as a reason field or an inline error. */
  children?: ReactNode
  confirmDisabled?: boolean
  confirmVariant?: ButtonProps["variant"]
}

/** Small confirmation dialog for destructive or state-changing actions. */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  destructive,
  onConfirm,
  pending,
  children,
  confirmDisabled,
  confirmVariant,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false)

  const confirm = async () => {
    try {
      await onConfirm()
      setOpen(false)
    } catch {
      // keep open; the caller renders the error
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant={confirmVariant ?? (destructive ? "destructive" : "default")}
            onClick={confirm}
            loading={pending}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
