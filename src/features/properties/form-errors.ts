import type { FieldPath, FieldValues, UseFormReturn } from "react-hook-form"

import { isApiError } from "@/lib/api/errors"

/**
 * Puts backend field errors onto matching form fields. Returns the message to show
 * at form level when nothing could be mapped (or null when everything was mapped).
 */
export function applyApiErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  error: unknown,
  aliases: Record<string, FieldPath<T>> = {}
): string | null {
  if (!isApiError(error)) return "Something went wrong. Please try again."
  const known = Object.keys(form.getValues())
  let mapped = 0
  for (const [field, message] of Object.entries(error.fieldErrors())) {
    const name = (aliases[field] ?? field.split(".")[0]) as FieldPath<T>
    if (known.includes(name)) {
      form.setError(name, { message }, { shouldFocus: mapped === 0 })
      mapped += 1
    }
  }
  if (mapped > 0) return null
  if (error.code === "KYC_REQUIRED")
    return "Your identity verification must be approved before you can do this."
  return error.userMessage
}
