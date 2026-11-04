"use client"

import { X } from "lucide-react"

import { SearchInput } from "@/components/shared/search-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUrlState } from "@/hooks/use-url-state"
import { humanize } from "@/lib/format"
import { ACTOR_ROLES, ENTITY_LABEL, ENTITY_TYPES } from "./labels"

const ALL = "__all"
const KEYS = ["action", "entity", "role", "from", "to", "actor", "target"]

/** Control bar for /admin/audit. Every filter lives in the URL. */
export function AuditFilters() {
  const { get, set, clear, isPending } = useUrlState()
  const active = KEYS.some((k) => get(k))
  const actor = get("actor")
  const target = get("target")

  return (
    <div
      role="search"
      aria-busy={isPending || undefined}
      className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.8fr)]">
        <SearchInput
          param="action"
          placeholder="Action contains, e.g. kyc. or takedown"
          label="Filter by action"
        />
        <Select value={get("entity") || ALL} onValueChange={(v) => set({ entity: v === ALL ? null : v })}>
          <SelectTrigger className="w-full" aria-label="Target type">
            <SelectValue placeholder="Any target" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any target</SelectItem>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {ENTITY_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={get("role") || ALL} onValueChange={(v) => set({ role: v === ALL ? null : v })}>
          <SelectTrigger className="w-full" aria-label="Actor role">
            <SelectValue placeholder="Any actor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any actor</SelectItem>
            {ACTOR_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {humanize(r)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-1">
          <Label htmlFor="audit-from" className="text-xs text-muted-foreground">
            From
          </Label>
          <Input
            id="audit-from"
            type="date"
            value={get("from")}
            max={get("to") || undefined}
            onChange={(e) => set({ from: e.target.value || null })}
            className="h-9 w-40"
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="audit-to" className="text-xs text-muted-foreground">
            To
          </Label>
          <Input
            id="audit-to"
            type="date"
            value={get("to")}
            min={get("from") || undefined}
            onChange={(e) => set({ to: e.target.value || null })}
            className="h-9 w-40"
          />
        </div>
        {actor && (
          <Button variant="secondary" size="sm" className="h-9" onClick={() => set({ actor: null })}>
            Actor {actor.slice(0, 8)} <X />
          </Button>
        )}
        {target && (
          <Button variant="secondary" size="sm" className="h-9" onClick={() => set({ target: null })}>
            Target {target.slice(0, 8)} <X />
          </Button>
        )}
        {active && (
          <Button variant="ghost" size="sm" className="h-9" onClick={() => clear(KEYS)}>
            Clear filters
          </Button>
        )}
      </div>
    </div>
  )
}
