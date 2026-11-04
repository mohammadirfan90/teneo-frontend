"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, LogIn, Send } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"

import { TextareaField } from "@/components/shared/form-fields"
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
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import type { Role } from "@/types/api"
import type { ApplicationView } from "@/types/domain"

// Mirrors B7A6 createApplicationSchema: message optional, 20..2000 when present.
const schema = z.object({
  message: z
    .string()
    .trim()
    .max(2000, "Keep it under 2,000 characters")
    .refine((v) => v.length === 0 || v.length >= 20, "Write at least 20 characters, or leave it empty"),
})
type Values = z.infer<typeof schema>

export function ApplyPanel({
  roomId,
  role,
  roomLabel,
}: {
  roomId: string
  role: Role | null | "ANON"
  roomLabel: string
}) {
  if (role === "ANON") {
    return (
      <Button asChild size="lg" className="w-full">
        <Link href={`/login?next=${encodeURIComponent(`/rooms/${roomId}`)}`}>
          <LogIn /> Sign in to apply
        </Link>
      </Button>
    )
  }
  if (role !== "TENANT") {
    return (
      <p className="rounded-lg bg-surface-2 p-3 text-sm text-muted-foreground">
        Applications are made from a tenant account. You&apos;re signed in as{" "}
        {role === "OWNER" ? "an owner" : role === "ADMIN" ? "an admin" : "a user without a role"}.
      </p>
    )
  }
  return <ApplyDialog roomId={roomId} roomLabel={roomLabel} />
}

function ApplyDialog({ roomId, roomLabel }: { roomId: string; roomLabel: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [blocker, setBlocker] = useState<{ message: string; href: string; cta: string } | null>(null)
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { message: "" },
    mode: "onTouched",
  })

  const apply = useMutation({
    meta: { silent: true },
    mutationFn: (v: Values) =>
      apiClient.post<ApplicationView>("/applications", {
        roomId,
        ...(v.message ? { message: v.message } : {}),
      }),
    onSuccess: (app) => {
      setOpen(false)
      toast.success("Application sent", {
        description: "The owner will review it and may propose a viewing.",
      })
      router.push(`/dashboard/applications/${app.id}`)
    },
    onError: (e) => {
      if (!isApiError(e))
        return setBlocker({ message: "Couldn't send your application. Try again.", href: "", cta: "" })
      if (e.code === "KYC_REQUIRED")
        return setBlocker({
          message: "Verify your identity before applying. It takes a few minutes to submit.",
          href: "/dashboard/profile",
          cta: "Go to verification",
        })
      if (e.status === 409)
        return setBlocker({
          message: "You already have an active application for this room.",
          href: "/dashboard/applications",
          cta: "View my applications",
        })
      if (e.status === 404)
        return setBlocker({
          message: "This room is no longer accepting applications.",
          href: "/rooms",
          cta: "Find another room",
        })
      const fields = e.fieldErrors()
      if (fields.message) form.setError("message", { message: fields.message })
      else setBlocker({ message: e.userMessage, href: "", cta: "" })
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setBlocker(null)
      }}
    >
      <DialogTrigger asChild>
        <Button size="lg" className="w-full">
          <Send /> Apply for this room
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply for {roomLabel}</DialogTitle>
          <DialogDescription>
            Introduce yourself to the owner. A short note about your work or studies and your move-in date
            helps.
          </DialogDescription>
        </DialogHeader>
        <form
          id="apply-form"
          onSubmit={form.handleSubmit((v) => apply.mutate(v))}
          noValidate
          className="grid gap-4"
        >
          {blocker && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription className="flex flex-col items-start gap-2">
                {blocker.message}
                {blocker.href && (
                  <Link href={blocker.href} className="font-medium underline underline-offset-4">
                    {blocker.cta}
                  </Link>
                )}
              </AlertDescription>
            </Alert>
          )}
          <TextareaField
            control={form.control}
            name="message"
            label="Message to the owner"
            description="Optional · at least 20 characters if you write one"
            rows={5}
            placeholder="Hi, I'm a product designer working in Gulshan and looking to move in from next month…"
          />
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form="apply-form" loading={apply.isPending}>
            Send application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
