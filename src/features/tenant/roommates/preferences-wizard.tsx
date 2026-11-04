"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react"
import { useEffect, useId, useState, type KeyboardEvent } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { cn } from "cn"

import { TextField } from "@/components/shared/form-fields"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import type { PreferencesView } from "../types"
import {
  LIFESTYLE_LABEL,
  PETS,
  SLEEP,
  SMOKING,
  STEP_FIELDS,
  VISIBILITY,
  VISIBILITY_LABEL,
  draftFromPreferences,
  preferencesSchema,
  toPreferencesPut,
  type PreferencesDraft,
} from "./schema"
import { useRoommateDraft } from "./store"

const STEPS = ["Budget & cities", "Move-in & lifestyle", "Interests & visibility"]

/** 3-step preferences wizard. The draft lives in a Zustand store, validated per step with Zod. */
export function PreferencesWizard({
  saved,
  citySuggestions,
  onSaved,
  onCancel,
}: {
  saved: PreferencesView | null
  citySuggestions: string[]
  onSaved: (p: PreferencesView) => void
  onCancel?: () => void
}) {
  const source = saved?.updatedAt ?? ""
  // Resume the stored draft when it was started from this same saved version.
  const [{ initial, initialStep }] = useState(() => {
    const st = useRoommateDraft.getState()
    if (st.source === source) return { initial: st.draft, initialStep: st.step }
    return { initial: saved ? draftFromPreferences(saved) : st.draft, initialStep: 0 }
  })
  const [step, setStepLocal] = useState(initialStep)
  const hydrate = useRoommateDraft((s) => s.hydrate)
  const update = useRoommateDraft((s) => s.update)
  const setStoreStep = useRoommateDraft((s) => s.setStep)
  const resetStore = useRoommateDraft((s) => s.reset)

  const form = useForm<PreferencesDraft>({ resolver: zodResolver(preferencesSchema), defaultValues: initial })
  const values = useWatch({ control: form.control }) as PreferencesDraft

  useEffect(() => {
    hydrate(source, initial)
  }, [hydrate, source, initial])
  useEffect(() => {
    update(values)
  }, [values, update])

  const goTo = (n: number) => {
    setStepLocal(n)
    setStoreStep(n)
  }

  const save = useMutation({
    meta: { silent: true },
    mutationFn: (d: PreferencesDraft) =>
      apiClient.put<PreferencesView>("/preferences/tenant", toPreferencesPut(d)),
    onSuccess: (p) => {
      resetStore(p.updatedAt, draftFromPreferences(p))
      toast.success("Preferences saved")
      onSaved(p)
    },
    onError: (e) => {
      if (!isApiError(e)) return toast.error("Couldn't save. Try again.")
      const f = e.fieldErrors()
      if (f.budgetMinMinor) {
        form.setError("budgetMax", { message: "Maximum must be at least the minimum" })
        return goTo(0)
      }
      toast.error(e.userMessage)
    },
  })

  const next = async () => {
    if (await form.trigger(STEP_FIELDS[step])) goTo(step + 1)
  }

  return (
    <section aria-labelledby="wizard-heading" className="rounded-xl border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="wizard-heading" className="text-lg font-semibold">
            {saved ? "Edit your preferences" : "Tell us what you're looking for"}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Matching compares these with other tenants&apos;.
          </p>
        </div>
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>

      <ol className="mt-5 grid grid-cols-3 gap-2" aria-label="Steps">
        {STEPS.map((label, i) => (
          <li key={label} aria-current={i === step ? "step" : undefined} className="flex flex-col gap-1.5">
            <span
              className={cn(
                "h-1 rounded-full",
                i < step ? "bg-primary/50" : i === step ? "bg-primary" : "bg-surface-2"
              )}
            />
            <span className={cn("text-xs sm:text-sm", i === step ? "font-medium" : "text-muted-foreground")}>
              <span className="tabular-nums">{i + 1}.</span> {label}
            </span>
          </li>
        ))}
      </ol>

      <form
        noValidate
        className="mt-6 flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault()
          if (step < STEPS.length - 1) void next()
          else void form.handleSubmit((d) => save.mutate(d))()
        }}
      >
        {step === 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                control={form.control}
                name="budgetMin"
                label="Minimum rent (৳ / month)"
                inputMode="numeric"
                placeholder="10000"
              />
              <TextField
                control={form.control}
                name="budgetMax"
                label="Maximum rent (৳ / month)"
                inputMode="numeric"
                placeholder="30000"
              />
            </div>
            <Controller
              control={form.control}
              name="cities"
              render={({ field, fieldState }) => (
                <ChipsField
                  label="Cities you'd live in"
                  description="Press Enter after each one."
                  value={field.value}
                  onChange={field.onChange}
                  suggestions={citySuggestions}
                  max={20}
                  maxLength={80}
                  error={fieldState.error?.message ?? fieldState.error?.root?.message}
                  placeholder="Dhaka"
                />
              )}
            />
          </>
        )}

        {step === 1 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField control={form.control} name="moveInFrom" label="Earliest move-in" type="date" />
              <TextField control={form.control} name="moveInTo" label="Latest move-in" type="date" />
            </div>
            <LifestyleField name="smoking" legend="Smoking" options={SMOKING} control={form.control} />
            <LifestyleField name="pets" legend="Pets" options={PETS} control={form.control} />
            <LifestyleField name="sleep" legend="Daily rhythm" options={SLEEP} control={form.control} />
          </>
        )}

        {step === 2 && (
          <>
            <Controller
              control={form.control}
              name="interests"
              render={({ field, fieldState }) => (
                <ChipsField
                  label="Interests"
                  description="Shared interests add to your match score. Up to 30."
                  value={field.value}
                  onChange={field.onChange}
                  max={30}
                  maxLength={40}
                  error={fieldState.error?.message ?? fieldState.error?.root?.message}
                  placeholder="cooking, football, podcasts"
                />
              )}
            />
            <Controller
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FieldSet>
                  <FieldLegend variant="label">Who can see your profile</FieldLegend>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="grid gap-2 sm:grid-cols-3"
                  >
                    {VISIBILITY.map((v) => (
                      <label
                        key={v}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                          field.value === v ? "border-primary/50 bg-primary/5" : "hover:bg-surface-2/60"
                        )}
                      >
                        <RadioGroupItem value={v} className="mt-0.5" />
                        <span>
                          <span className="block text-sm font-medium">{VISIBILITY_LABEL[v].title}</span>
                          <span className="block text-xs text-muted-foreground">
                            {VISIBILITY_LABEL[v].body}
                          </span>
                        </span>
                      </label>
                    ))}
                  </RadioGroup>
                </FieldSet>
              )}
            />
          </>
        )}

        <div className="flex items-center justify-between gap-3 border-t pt-4">
          {step > 0 ? (
            <Button type="button" variant="ghost" onClick={() => goTo(step - 1)}>
              <ArrowLeft /> Back
            </Button>
          ) : (
            <span />
          )}
          {step < STEPS.length - 1 ? (
            <Button type="submit">
              Next <ArrowRight />
            </Button>
          ) : (
            <Button type="submit" loading={save.isPending}>
              <Check /> Save preferences
            </Button>
          )}
        </div>
      </form>
    </section>
  )
}

function LifestyleField<K extends "smoking" | "pets" | "sleep">({
  name,
  legend,
  options,
  control,
}: {
  name: K
  legend: string
  options: readonly (keyof (typeof LIFESTYLE_LABEL)[K])[]
  control: ReturnType<typeof useForm<PreferencesDraft>>["control"]
}) {
  const labels = LIFESTYLE_LABEL[name] as Record<string, string>
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <FieldSet>
          <FieldLegend variant="label">{legend}</FieldLegend>
          <ToggleGroup
            type="single"
            variant="outline"
            value={field.value}
            onValueChange={(v) => field.onChange(v)}
            className="flex-wrap"
            aria-label={legend}
          >
            {options.map((o) => (
              <ToggleGroupItem key={String(o)} value={String(o)} className="h-9 px-3">
                {labels[String(o)]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </FieldSet>
      )}
    />
  )
}

function ChipsField({
  label,
  description,
  value,
  onChange,
  suggestions = [],
  max,
  maxLength,
  error,
  placeholder,
}: {
  label: string
  description?: string
  value: string[]
  onChange: (v: string[]) => void
  suggestions?: string[]
  max: number
  maxLength: number
  error?: string
  placeholder?: string
}) {
  const id = useId()
  const [text, setText] = useState("")
  const add = (raw: string) => {
    const items = raw
      .split(",")
      .map((s) => s.trim().slice(0, maxLength))
      .filter(Boolean)
    const next = [...value]
    for (const it of items)
      if (!next.some((v) => v.toLowerCase() === it.toLowerCase()) && next.length < max) next.push(it)
    onChange(next)
    setText("")
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      if (text.trim()) add(text)
    } else if (e.key === "Backspace" && !text && value.length) {
      onChange(value.slice(0, -1))
    }
  }
  const unused = suggestions.filter((s) => !value.includes(s)).slice(0, 8)

  return (
    <Field data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2 py-1.5 focus-within:ring-3 focus-within:ring-ring/40">
        {value.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-md bg-surface-2 py-0.5 pr-1 pl-2 text-sm"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== v))}
              aria-label={`Remove ${v}`}
              className="grid size-6 place-items-center rounded text-subtle hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </span>
        ))}
        <Input
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => text.trim() && add(text)}
          placeholder={value.length ? "" : placeholder}
          disabled={value.length >= max}
          aria-invalid={Boolean(error) || undefined}
          className="h-7 min-w-32 flex-1 border-0 px-1 shadow-none focus-visible:ring-0"
        />
      </div>
      {unused.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Suggestions:</span>
          {unused.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-md border px-2 py-0.5 text-xs hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
      {description && !error && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}
