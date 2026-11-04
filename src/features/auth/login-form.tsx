"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"

import { PasswordField, TextField } from "@/components/shared/form-fields"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { loginAction } from "./actions"
import { loginSchema, type LoginValues } from "./schemas"

export function LoginForm() {
  const next = useSearchParams().get("next") ?? undefined
  const [pending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  })

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null)
    startTransition(async () => {
      // Resolves only on failure; success redirects on the server.
      const result = await loginAction(values, next)
      if (!result) return
      setFormError(result.message)
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        if (field === "email" || field === "password") form.setError(field, { message })
      }
    })
  })

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        {formError && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <TextField
          control={form.control}
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
        />
        <PasswordField
          control={form.control}
          name="password"
          label="Password"
          autoComplete="current-password"
        />
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          Sign in
        </Button>
      </FieldGroup>
    </form>
  )
}
