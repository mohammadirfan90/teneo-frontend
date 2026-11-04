"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { MailCheck } from "lucide-react"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

import { TextField, TextareaField } from "@/components/shared/form-fields"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const TOPICS = [
  "Renting a room",
  "Listing a property",
  "Payments and invoices",
  "Verification (KYC)",
  "Something else",
] as const

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80, "Keep it under 80 characters"),
  email: z.string().trim().min(1, "Enter your email").max(254).pipe(z.email("Enter a valid email address")),
  topic: z.enum(TOPICS, "Choose a topic"),
  message: z
    .string()
    .trim()
    .min(20, "Tell us a little more (20 characters or more)")
    .max(2000, "Keep it under 2,000 characters"),
})
type Values = z.infer<typeof schema>

/** The backend has no messaging endpoint, so this composes an email in the visitor's mail app. */
export function ContactForm({ to }: { to: string }) {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", message: "" },
    mode: "onTouched",
  })

  const onSubmit = form.handleSubmit((v) => {
    const subject = `[${v.topic}] Message from ${v.name}`
    const body = `${v.message}\n\n— ${v.name} (${v.email})`
    window.location.assign(`mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
    setSentTo(to)
  })

  if (sentTo) {
    return (
      <div role="status" className="rounded-xl border bg-card p-6">
        <MailCheck className="size-5 text-success" aria-hidden />
        <h2 className="mt-3 font-semibold">Your email is ready to send</h2>
        <p className="mt-1 text-muted-foreground">
          We opened your email app with the message filled in. If nothing opened, write to{" "}
          <a
            href={`mailto:${sentTo}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {sentTo}
          </a>
          .
        </p>
        <Button variant="ghost" className="mt-4 -ml-3" onClick={() => setSentTo(null)}>
          Write another message
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-xl border bg-card p-5 sm:p-6">
      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField control={form.control} name="name" label="Your name" autoComplete="name" />
          <TextField control={form.control} name="email" label="Email" type="email" autoComplete="email" />
        </div>
        <Controller
          control={form.control}
          name="topic"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="topic">Topic</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="topic" className="w-full" aria-invalid={fieldState.invalid || undefined}>
                  <SelectValue placeholder="Choose a topic" />
                </SelectTrigger>
                <SelectContent>
                  {TOPICS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <TextareaField control={form.control} name="message" label="Message" rows={6} />
        <Button type="submit" className="w-full sm:w-auto sm:self-start">
          Write email
        </Button>
      </FieldGroup>
    </form>
  )
}
