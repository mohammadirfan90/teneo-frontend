"use client"

import { SlidersHorizontal, X } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchInput } from "@/components/shared/search-input"
import { useUrlState } from "@/hooks/use-url-state"
import { AMENITIES, SORTS, SORT_LABEL } from "./query"

const ALL = "__all"

/** Page-level control bar for /rooms. Every control writes to the URL. */
export function RoomFilters({ cities }: { cities: string[] }) {
  const { get, set, clear, isPending } = useUrlState()
  const amenities = get("amenities").split(",").filter(Boolean)
  const toggleAmenity = (value: string, on: boolean) => {
    const next = on ? [...new Set([...amenities, value])] : amenities.filter((a) => a !== value)
    set({ amenities: next.length ? next.join(",") : null })
  }

  const hasFilters = ["city", "q", "min", "max", "amenities", "from"].some((k) => get(k))

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:p-4"
      aria-busy={isPending || undefined}
      role="search"
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <SearchInput placeholder="Search by building or area" label="Search rooms" />
        <Select value={get("city") || ALL} onValueChange={(v) => set({ city: v === ALL ? null : v })}>
          <SelectTrigger className="w-full" aria-label="City">
            <SelectValue placeholder="Any city" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any city</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={get("sort") || "newest"}
          onValueChange={(v) => set({ sort: v === "newest" ? null : v })}
        >
          <SelectTrigger className="w-full" aria-label="Sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s} value={s}>
                {SORT_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <RentRange
          key={`${get("min")}|${get("max")}`}
          initialMin={get("min")}
          initialMax={get("max")}
          onApply={(lo, hi) => set({ min: lo, max: hi })}
        />

        <div className="grid gap-1">
          <Label htmlFor="from" className="text-xs text-muted-foreground">
            Move in by
          </Label>
          <Input
            id="from"
            type="date"
            value={get("from")}
            onChange={(e) => set({ from: e.target.value || null })}
            className="h-9 w-40"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9">
              <SlidersHorizontal />
              Amenities
              {amenities.length > 0 && (
                <span className="rounded bg-primary/10 px-1.5 text-xs text-primary tabular-nums">
                  {amenities.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64">
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Must have</legend>
              <div className="grid gap-2">
                {AMENITIES.map((a) => (
                  <label key={a.value} className="flex items-center gap-2.5 text-sm">
                    <Checkbox
                      checked={amenities.includes(a.value)}
                      onCheckedChange={(v) => toggleAmenity(a.value, v === true)}
                    />
                    {a.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </PopoverContent>
        </Popover>

        {hasFilters && (
          <Button
            variant="ghost"
            className="h-9"
            onClick={() => clear(["city", "q", "min", "max", "amenities", "from"])}
          >
            <X /> Clear filters
          </Button>
        )}
      </div>
    </div>
  )
}

/** Local edits until blur/Enter; remounted (via key) when the URL changes. */
function RentRange({
  initialMin,
  initialMax,
  onApply,
}: {
  initialMin: string
  initialMax: string
  onApply: (min: string | null, max: string | null) => void
}) {
  const [min, setMin] = useState(initialMin)
  const [max, setMax] = useState(initialMax)
  const applyRent = () => {
    const lo = min ? String(Math.round(Number(min))) : null
    const hi = max ? String(Math.round(Number(max))) : null
    if (lo !== (initialMin || null) || hi !== (initialMax || null)) onApply(lo, hi)
  }
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        applyRent()
      }}
    >
      <div className="grid gap-1">
        <Label htmlFor="rent-min" className="text-xs text-muted-foreground">
          Min rent (৳)
        </Label>
        <Input
          id="rent-min"
          inputMode="numeric"
          value={min}
          onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))}
          onBlur={applyRent}
          placeholder="0"
          className="h-9 w-28"
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="rent-max" className="text-xs text-muted-foreground">
          Max rent (৳)
        </Label>
        <Input
          id="rent-max"
          inputMode="numeric"
          value={max}
          onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))}
          onBlur={applyRent}
          placeholder="Any"
          className="h-9 w-28"
        />
      </div>
      <button type="submit" className="sr-only">
        Apply rent range
      </button>
    </form>
  )
}
