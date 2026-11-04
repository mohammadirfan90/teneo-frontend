"use client"

import { Check } from "lucide-react"
import { Controller, type Control } from "react-hook-form"
import { cn } from "cn"

import { TextField, TextareaField } from "@/components/shared/form-fields"
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { PROPERTY_TYPE_LABEL, ROOM_TYPE_LABEL } from "@/features/rooms/labels"
import { AMENITIES, AMENITY_LABEL } from "@/features/rooms/query"
import {
  PROPERTY_TYPES,
  ROOM_TYPES,
  type BuildingValues,
  type FlatValues,
  type PropertyValues,
  type RoomValues,
} from "./schemas"

const PROPERTY_TYPE_HINT: Record<(typeof PROPERTY_TYPES)[number], string> = {
  BUILDING: "Several flats over one or more floors",
  VILLA: "A house you rent by the room",
  STANDALONE_FLAT: "A single flat in someone else's building",
}

export function PropertyFields({
  control,
  lockType,
}: {
  control: Control<PropertyValues>
  lockType?: boolean
}) {
  return (
    <div className="grid gap-5">
      <Controller
        control={control}
        name="propertyType"
        render={({ field, fieldState }) => (
          <FieldSet data-invalid={fieldState.invalid || undefined}>
            <FieldLegend variant="label">Kind of property</FieldLegend>
            <div role="radiogroup" className="grid gap-2 sm:grid-cols-3">
              {PROPERTY_TYPES.map((t) => {
                const checked = field.value === t
                return (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    disabled={lockType && !checked}
                    onClick={() => field.onChange(t)}
                    onBlur={field.onBlur}
                    className={cn(
                      "rounded-xl border bg-card p-3.5 text-left transition-colors duration-150 hover:border-input focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-50",
                      checked && "border-primary bg-primary/[0.04] ring-1 ring-primary"
                    )}
                  >
                    <span className="block text-sm font-medium">{PROPERTY_TYPE_LABEL[t]}</span>
                    <span className="mt-0.5 block text-[0.8125rem] text-muted-foreground">
                      {PROPERTY_TYPE_HINT[t]}
                    </span>
                  </button>
                )
              })}
            </div>
            <FieldError errors={[fieldState.error]} />
          </FieldSet>
        )}
      />

      <TextField control={control} name="title" label="Listing name" placeholder="e.g. Lakeview Residence" />
      <TextareaField
        control={control}
        name="description"
        label="Description"
        description="Optional · what tenants should know about the building and neighbourhood"
        rows={4}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          control={control}
          name="addressLine1"
          label="Street address"
          autoComplete="address-line1"
          placeholder="e.g. House 14, Road 90"
        />
        <TextField
          control={control}
          name="addressLine2"
          label="Address line 2"
          autoComplete="address-line2"
          description="Optional"
        />
        <TextField
          control={control}
          name="area"
          label="Area"
          placeholder="e.g. Gulshan 2"
          description="Optional"
        />
        <TextField
          control={control}
          name="city"
          label="City"
          autoComplete="address-level2"
          placeholder="e.g. Dhaka"
          description="Tenants filter by the exact city name"
        />
        <TextField
          control={control}
          name="postalCode"
          label="Postal code"
          autoComplete="postal-code"
          description="Optional"
        />
        <TextField
          control={control}
          name="countryCode"
          label="Country code"
          maxLength={2}
          autoComplete="country"
          className="uppercase"
        />
      </div>
    </div>
  )
}

export function BuildingFields({ control }: { control: Control<BuildingValues> }) {
  return (
    <div className="grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <TextField control={control} name="name" label="Building name" placeholder="e.g. Tower A" />
      <TextField control={control} name="floors" label="Floors" inputMode="numeric" description="Optional" />
    </div>
  )
}

export function FlatFields({ control }: { control: Control<FlatValues> }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <TextField
        control={control}
        name="floor"
        label="Floor"
        inputMode="numeric"
        description="0 is the ground floor"
      />
      <TextField
        control={control}
        name="doorNumber"
        label="Door number"
        placeholder="e.g. 4B"
        description="Optional"
      />
    </div>
  )
}

export function RoomFields({
  control,
  currency = "BDT",
}: {
  control: Control<RoomValues>
  currency?: string
}) {
  const money = currency === "BDT" ? "৳" : currency
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          control={control}
          name="label"
          label="Room name"
          placeholder="e.g. Room 4B-1 (lake view)"
        />
        <Controller
          control={control}
          name="roomType"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor={field.name}>Room type</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id={field.name} className="w-full" onBlur={field.onBlur}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROOM_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ROOM_TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        <TextField control={control} name="rent" label={`Rent / month (${money})`} inputMode="decimal" />
        <TextField control={control} name="deposit" label={`Deposit (${money})`} inputMode="decimal" />
        <TextField
          control={control}
          name="sizeSqft"
          label="Size (sq ft)"
          inputMode="decimal"
          description="Optional"
        />
        <TextField control={control} name="maxOccupants" label="Max occupants" inputMode="numeric" />
      </div>

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
        <TextField
          control={control}
          name="availableFrom"
          label="Available from"
          type="date"
          description="Empty means now"
        />
        <TextField
          control={control}
          name="minLeaseMonths"
          label="Min lease (months)"
          inputMode="numeric"
          description="Optional"
        />
        <TextField
          control={control}
          name="maxLeaseMonths"
          label="Max lease (months)"
          inputMode="numeric"
          description="Optional"
        />
      </div>

      <Controller
        control={control}
        name="billsIncluded"
        render={({ field }) => (
          <Field orientation="horizontal" className="rounded-lg border p-3">
            <Switch id="billsIncluded" checked={field.value} onCheckedChange={field.onChange} />
            <div className="grid gap-0.5">
              <FieldLabel htmlFor="billsIncluded">Utility bills included in rent</FieldLabel>
              <FieldDescription>Otherwise you bill metered utilities separately.</FieldDescription>
            </div>
          </Field>
        )}
      />

      <Controller
        control={control}
        name="amenities"
        render={({ field, fieldState }) => {
          const selected: string[] = field.value
          const toggle = (v: string) =>
            field.onChange(selected.includes(v) ? selected.filter((a) => a !== v) : [...selected, v])
          const extra = selected.filter((a) => !(a in AMENITY_LABEL))
          return (
            <FieldSet data-invalid={fieldState.invalid || undefined}>
              <FieldLegend variant="label">Amenities</FieldLegend>
              <div className="flex flex-wrap gap-2">
                {[...AMENITIES, ...extra.map((a) => ({ value: a, label: a }))].map((a) => {
                  const on = selected.includes(a.value)
                  return (
                    <button
                      key={a.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(a.value)}
                      className={cn(
                        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors duration-150 hover:border-input focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none active:scale-[0.98]",
                        on ? "border-primary bg-primary/[0.06] text-primary" : "bg-card text-muted-foreground"
                      )}
                    >
                      {on && <Check className="size-3.5" aria-hidden />}
                      {a.label}
                    </button>
                  )
                })}
              </div>
              <FieldError errors={[fieldState.error]} />
            </FieldSet>
          )
        }}
      />

      <TextareaField
        control={control}
        name="rules"
        label="House rules"
        description="Optional · quiet hours, guests, smoking, pets"
        rows={3}
      />
    </div>
  )
}
