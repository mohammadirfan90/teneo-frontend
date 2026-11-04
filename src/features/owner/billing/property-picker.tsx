"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUrlState } from "@/hooks/use-url-state"

/** Chooses whose meters are shown; bound to the URL `property` param. Needs a <Suspense> ancestor. */
export function PropertyPicker({
  properties,
  selected,
}: {
  properties: Array<{ id: string; label: string }>
  selected: string
}) {
  const { set, isPending } = useUrlState()
  return (
    <Select value={selected} onValueChange={(v) => set({ property: v })}>
      <SelectTrigger className="w-full sm:w-80" aria-label="Property" aria-busy={isPending || undefined}>
        <SelectValue placeholder="Choose a property" />
      </SelectTrigger>
      <SelectContent>
        {properties.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
