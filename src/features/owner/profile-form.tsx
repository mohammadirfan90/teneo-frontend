"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { TextField, TextareaField } from "@/components/shared/form-fields"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import type { RoleProfileView } from "@/types/domain"

// Mirrors B7A6 ProfilePatch: displayName 2..80, bio ≤ 2000 (nullable).
const schema = z.object({
  displayName: z.string().trim().min(2, "Use at least 2 characters").max(80, "Use at most 80 characters"),
  bio: z.string().trim().max(2000, "Keep it under 2,000 characters"),
})
type Values = z.infer<typeof schema>

export function OwnerProfileForm({
  profile,
  fallbackName,
}: {
  profile: RoleProfileView | null
  fallbackName: string
}) {
  const router = useRouter()
  const qc = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: profile?.displayName ?? fallbackName, bio: profile?.bio ?? "" },
    mode: "onTouched",
  })
  const { isDirty } = form.formState

  const submit = form.handleSubmit(async (v) => {
    setFormError(null)
    try {
      const saved = await apiClient.patch<RoleProfileView>("/profiles/owner", {
        displayName: v.displayName.trim(),
        bio: v.bio.trim() || null,
      })
      form.reset({ displayName: saved.displayName, bio: saved.bio ?? "" })
      toast.success("Profile saved", { description: "Tenants see this name on your listings." })
      void qc.invalidateQueries({ queryKey: ["profiles", "owner"] })
      router.refresh()
    } catch (e) {
      if (!isApiError(e)) return setFormError("Couldn't save your profile. Try again.")
      const fields = e.fieldErrors()
      if (fields.displayName) form.setError("displayName", { message: fields.displayName })
      if (fields.bio) form.setError("bio", { message: fields.bio })
      if (!fields.displayName && !fields.bio) setFormError(e.userMessage)
    }
  })

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {formError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      <TextField
        control={form.control}
        name="displayName"
        label="Display name"
        autoComplete="name"
        description="Shown to tenants on every listing and application."
      />
      <TextareaField
        control={form.control}
        name="bio"
        label="About you"
        rows={5}
        description="Optional · how you manage your properties, response times, languages you speak"
      />
      <div className="flex justify-end">
        <Button type="submit" loading={form.formState.isSubmitting} disabled={!isDirty}>
          Save profile
        </Button>
      </div>
    </form>
  )
}
