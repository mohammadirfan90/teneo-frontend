"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, Building2, Check, KeyRound, type LucideIcon } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { cn } from "cn"

import { PasswordField, TextField } from "@/components/shared/form-fields"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field"
import { registerAction } from "./actions"
import { SIGNUP_ROLES, registerSchema, type RegisterValues } from "./schemas"

const ROLE_OPTIONS: Record<(typeof SIGNUP_ROLES)[number], { title: string; body: string; icon: LucideIcon }> =
  {
    TENANT: { title: "I'm looking for a room", body: "Apply, sign leases, pay rent", icon: KeyRound },
    OWNER: { title: "I have rooms to rent", body: "List rooms, screen tenants, bill", icon: Building2 },
  }

const PASSWORD_RULES = [
  { label: "12 or more characters", test: (v: string) => v.length >= 12 },
  { label: "A letter", test: (v: string) => /[A-Za-z]/.test(v) },
  { label: "A number", test: (v: string) => /[0-9]/.test(v) },
]

export function RegisterForm() {
  const roleParam = useSearchParams().get("role")?.toUpperCase()
  const initialRole = roleParam === "OWNER" || roleParam === "TENANT" ? roleParam : undefined
  const [pending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: initialRole, email: "", password: "", confirmPassword: "" },
    mode: "onTouched",
  })
  const password = useWatch({ control: form.control, name: "password" }) ?? ""

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null)
    startTransition(async () => {
      const result = await registerAction(values)
      if (!result) return
      setFormError(result.message)
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        if (field === "email" || field === "password" || field === "role") form.setError(field, { message })
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

        <Controller
          control={form.control}
          name="role"
          render={({ field, fieldState }) => (
            <FieldSet data-invalid={fieldState.invalid || undefined}>
              <FieldLegend variant="label">How will you use Teneo?</FieldLegend>
              <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
                {SIGNUP_ROLES.map((role) => {
                  const opt = ROLE_OPTIONS[role]
                  const checked = field.value === role
                  return (
                    <button
                      key={role}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      onClick={() => field.onChange(role)}
                      onBlur={field.onBlur}
                      className={cn(
                        "relative flex items-start gap-3 rounded-xl border bg-card p-3.5 text-left transition-colors duration-150 hover:border-input",
                        checked && "border-primary bg-primary/[0.04] ring-1 ring-primary"
                      )}
                    >
                      <opt.icon
                        className={cn("mt-0.5 size-4 shrink-0", checked ? "text-primary" : "text-subtle")}
                        aria-hidden
                      />
                      <span>
                        <span className="block text-sm font-medium">{opt.title}</span>
                        <span className="mt-0.5 block text-[0.8125rem] text-muted-foreground">
                          {opt.body}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
              <FieldError errors={[fieldState.error]} />
            </FieldSet>
          )}
        />

        <TextField
          control={form.control}
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
        />

        <Field>
          <PasswordField
            control={form.control}
            name="password"
            label="Password"
            autoComplete="new-password"
          />
          <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Password requirements">
            {PASSWORD_RULES.map((rule) => {
              const met = rule.test(password)
              return (
                <li
                  key={rule.label}
                  className={cn(
                    "flex items-center gap-1.5 text-[0.8125rem] transition-colors duration-150",
                    met ? "text-success" : "text-subtle"
                  )}
                >
                  <Check className={cn("size-3.5", !met && "opacity-40")} aria-hidden />
                  {rule.label}
                  <span className="sr-only">{met ? "(met)" : "(not met)"}</span>
                </li>
              )
            })}
          </ul>
        </Field>

        <PasswordField
          control={form.control}
          name="confirmPassword"
          label="Confirm password"
          autoComplete="new-password"
        />

        <Button type="submit" size="lg" className="w-full" loading={pending}>
          Create account
        </Button>
      </FieldGroup>
    </form>
  )
}
