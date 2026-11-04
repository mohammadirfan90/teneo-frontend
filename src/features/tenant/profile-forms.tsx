"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { TextField, TextareaField } from "@/components/shared/form-fields"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import type { Gender, MeView } from "@/types/api"
import type { RoleProfileView } from "@/types/domain"

const GENDERS: Array<{ value: Gender; label: string }> = [
  { value: "FEMALE", label: "Female" },
  { value: "MALE", label: "Male" },
  { value: "NONBINARY", label: "Non-binary" },
  { value: "UNDISCLOSED", label: "Prefer not to say" },
]

// Mirrors B7A6 updateMeSchema: phone /^\+?[0-9]{7,15}$/ or null; gender enum.
const accountSchema = z.object({
  phone: z
    .string()
    .trim()
    .max(16, "Use at most 15 digits")
    .refine((v) => v === "" || /^\+?[0-9]{7,15}$/.test(v), "Use 7–15 digits, with an optional leading +"),
  gender: z.enum(["FEMALE", "MALE", "NONBINARY", "UNDISCLOSED", ""]),
})
type AccountValues = z.infer<typeof accountSchema>

export function AccountForm({ me }: { me: MeView }) {
  const router = useRouter()
  const form = useForm<AccountValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: { phone: me.phone ?? "", gender: me.gender ?? "" },
  })

  const save = useMutation({
    meta: { silent: true },
    mutationFn: (v: AccountValues) =>
      apiClient.patch<MeView>("/users/me", {
        phone: v.phone === "" ? null : v.phone,
        ...(v.gender ? { gender: v.gender } : {}),
      }),
    onSuccess: (updated) => {
      form.reset({ phone: updated.phone ?? "", gender: updated.gender ?? "" })
      toast.success("Account details saved")
      router.refresh()
    },
    onError: (e) => {
      if (!isApiError(e)) return toast.error("Couldn't save. Try again.")
      const fields = e.fieldErrors()
      if (fields.phone) form.setError("phone", { message: fields.phone })
      else if (fields.gender) form.setError("gender", { message: fields.gender })
      else toast.error(e.userMessage)
    },
  })

  return (
    <form onSubmit={form.handleSubmit((v) => save.mutate(v))} noValidate className="flex flex-col gap-4">
      <div className="grid gap-1">
        <p className="text-sm font-medium">Email</p>
        <p className="text-[0.9375rem] break-all text-muted-foreground">{me.email}</p>
      </div>
      <TextField
        control={form.control}
        name="phone"
        label="Phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+8801XXXXXXXXX"
        description="Optional. Include the country code, e.g. +880."
      />
      <Controller
        control={form.control}
        name="gender"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid || undefined}>
            <FieldLabel htmlFor="gender">Gender</FieldLabel>
            <Select value={field.value || undefined} onValueChange={field.onChange}>
              <SelectTrigger id="gender" className="w-full">
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>Used for roommate matching.</FieldDescription>
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />
      <div>
        <Button type="submit" loading={save.isPending} disabled={!form.formState.isDirty}>
          Save account
        </Button>
      </div>
    </form>
  )
}

// Mirrors B7A6 profilePatchSchema: displayName 2..80, bio ≤ 2000 or null.
const profileSchema = z.object({
  displayName: z.string().trim().min(2, "Use at least 2 characters").max(80, "Use at most 80 characters"),
  bio: z.string().trim().max(2000, "Keep it under 2,000 characters"),
})
type ProfileValues = z.infer<typeof profileSchema>

export function TenantProfileForm({ profile }: { profile: RoleProfileView | null }) {
  const router = useRouter()
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: profile?.displayName ?? "", bio: profile?.bio ?? "" },
  })

  const save = useMutation({
    meta: { silent: true },
    mutationFn: (v: ProfileValues) =>
      apiClient.patch<RoleProfileView>("/profiles/tenant", {
        displayName: v.displayName,
        bio: v.bio === "" ? null : v.bio,
      }),
    onSuccess: (updated) => {
      form.reset({ displayName: updated.displayName, bio: updated.bio ?? "" })
      toast.success("Profile saved")
      router.refresh()
    },
    onError: (e) => {
      if (!isApiError(e)) return toast.error("Couldn't save. Try again.")
      const fields = e.fieldErrors()
      if (fields.displayName) form.setError("displayName", { message: fields.displayName })
      else if (fields.bio) form.setError("bio", { message: fields.bio })
      else toast.error(e.userMessage)
    },
  })

  const bioLength = useWatch({ control: form.control, name: "bio" }).length

  return (
    <form onSubmit={form.handleSubmit((v) => save.mutate(v))} noValidate className="flex flex-col gap-4">
      <TextField
        control={form.control}
        name="displayName"
        label="Display name"
        autoComplete="name"
        description="Owners see this on your applications."
      />
      <TextareaField
        control={form.control}
        name="bio"
        label="About you"
        rows={5}
        placeholder="Your work or studies, daily routine, and what you're looking for in a home."
        labelAside={<span className="text-xs text-muted-foreground tabular-nums">{bioLength}/2000</span>}
      />
      <div>
        <Button type="submit" loading={save.isPending} disabled={!form.formState.isDirty}>
          Save profile
        </Button>
      </div>
    </form>
  )
}
