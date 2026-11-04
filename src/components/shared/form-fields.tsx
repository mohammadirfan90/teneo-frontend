"use client"

import { Eye, EyeOff } from "lucide-react"
import { useState, type ComponentProps, type ReactNode } from "react"
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form"

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface BaseProps<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  label: ReactNode
  description?: ReactNode
  /** Right side of the label row, e.g. a "Forgot?" link. */
  labelAside?: ReactNode
}

type TextFieldProps<T extends FieldValues> = BaseProps<T> &
  Omit<ComponentProps<typeof Input>, "name" | "value" | "onChange" | "onBlur" | "defaultValue">

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  labelAside,
  ...input
}: TextFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid || undefined}>
          <div className="flex items-center justify-between gap-2">
            <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
            {labelAside}
          </div>
          <Input
            {...input}
            {...field}
            value={field.value ?? ""}
            id={field.name}
            aria-invalid={fieldState.invalid || undefined}
            aria-describedby={description ? `${field.name}-desc` : undefined}
          />
          {description && !fieldState.error && (
            <FieldDescription id={`${field.name}-desc`}>{description}</FieldDescription>
          )}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}

export function PasswordField<T extends FieldValues>(props: Omit<TextFieldProps<T>, "type">) {
  const [visible, setVisible] = useState(false)
  const { control, name, label, description, labelAside, ...input } = props
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid || undefined}>
          <div className="flex items-center justify-between gap-2">
            <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
            {labelAside}
          </div>
          <div className="relative">
            <Input
              {...input}
              {...field}
              value={field.value ?? ""}
              id={field.name}
              type={visible ? "text" : "password"}
              className="pr-11"
              aria-invalid={fieldState.invalid || undefined}
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? "Hide password" : "Show password"}
              aria-pressed={visible}
              className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-md text-subtle hover:bg-muted hover:text-foreground"
            >
              {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {description && !fieldState.error && <FieldDescription>{description}</FieldDescription>}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}

type TextareaFieldProps<T extends FieldValues> = BaseProps<T> &
  Omit<ComponentProps<typeof Textarea>, "name" | "value" | "onChange" | "onBlur" | "defaultValue">

export function TextareaField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  labelAside,
  ...textarea
}: TextareaFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid || undefined}>
          <div className="flex items-center justify-between gap-2">
            <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
            {labelAside}
          </div>
          <Textarea
            {...textarea}
            {...field}
            value={field.value ?? ""}
            id={field.name}
            aria-invalid={fieldState.invalid || undefined}
          />
          {description && !fieldState.error && <FieldDescription>{description}</FieldDescription>}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}
