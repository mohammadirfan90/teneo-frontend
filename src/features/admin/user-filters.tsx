"use client"

import { ShieldAlert } from "lucide-react"

import { SearchInput } from "@/components/shared/search-input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useUrlState } from "@/hooks/use-url-state"

const ALL = "__all"
const ROLE_OPTIONS = [
  { value: "TENANT", label: "Tenants" },
  { value: "OWNER", label: "Owners" },
  { value: "ADMIN", label: "Admins" },
  { value: "NONE", label: "No role" },
] as const

/** Control bar for /admin/users. Every control writes to the URL. */
export function UserFilters() {
  const { get, set, isPending } = useUrlState()
  const reveal = get("pii") === "1"

  return (
    <div
      role="search"
      aria-busy={isPending || undefined}
      className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:p-4"
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <SearchInput placeholder="Name, email, phone or exact user id" label="Search users" />
        <Select value={get("role") || ALL} onValueChange={(v) => set({ role: v === ALL ? null : v })}>
          <SelectTrigger className="w-full" aria-label="Role">
            <SelectValue placeholder="Any role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any role</SelectItem>
            {ROLE_OPTIONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-start gap-3">
        <Switch
          id="reveal-pii"
          checked={reveal}
          onCheckedChange={(on) => set({ pii: on ? "1" : null }, { keepPage: true })}
          className="mt-0.5"
        />
        <div className="grid gap-0.5">
          <Label htmlFor="reveal-pii">Show email and phone</Label>
          <p className="flex items-center gap-1.5 text-[0.8125rem] text-muted-foreground">
            <ShieldAlert className="size-3.5 shrink-0" aria-hidden />
            Every page loaded with contact details is recorded in the audit log under your account.
          </p>
        </div>
      </div>
    </div>
  )
}
