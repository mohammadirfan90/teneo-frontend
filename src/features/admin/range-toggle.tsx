"use client"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useUrlState } from "@/hooks/use-url-state"
import { ACTIVITY_RANGES, DEFAULT_RANGE } from "./labels"

/** URL-synced window for the overview charts (`?days=`). Needs a <Suspense> ancestor. */
export function RangeToggle() {
  const { get, set, isPending } = useUrlState()
  const current = get("days") || String(DEFAULT_RANGE)
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      spacing={0}
      value={current}
      onValueChange={(v) => v && set({ days: v === String(DEFAULT_RANGE) ? null : v })}
      aria-label="Activity window"
      aria-busy={isPending || undefined}
    >
      {ACTIVITY_RANGES.map((d) => (
        <ToggleGroupItem key={d} value={String(d)} className="px-3 tabular-nums">
          {d} days
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
