"use client"

import { AlertTriangle, Clock } from "lucide-react"
import { cn } from "cn"

import { useMounted } from "@/features/owner/local-records"
import { formatDateTime, formatRelative } from "@/lib/format"
import type { MaintenancePriority, MaintenanceStatus } from "@/types/domain"
import { PRIORITY_LABEL } from "@/features/owner/labels"

const OPEN: MaintenanceStatus[] = ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "DISPUTED"]

/**
 * Response-target cell. `slaBreachedAt` is only stamped by the backend on a later
 * transition, so "past target" for a still-open ticket is computed here, after mount
 * (never on the server, which keeps renders deterministic).
 */
export function SlaIndicator({
  target,
  breachedAt,
  status,
  showRelative = false,
}: {
  target: string
  breachedAt: string | null
  status: MaintenanceStatus
  showRelative?: boolean
}) {
  const mounted = useMounted()
  // eslint-disable-next-line react-hooks/purity -- read only after mount, never during SSR/hydration
  const now = mounted ? Date.now() : null
  const open = OPEN.includes(status)
  const late = Boolean(breachedAt) || (open && now !== null && new Date(target).getTime() < now)

  return (
    <span className="inline-flex flex-col gap-0.5">
      <span className="tabular-nums">{formatDateTime(target)}</span>
      {late ? (
        <span className="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-destructive">
          <AlertTriangle className="size-3.5" aria-hidden />
          {breachedAt ? "Target missed" : "Past target"}
        </span>
      ) : open && showRelative && now !== null ? (
        <span className="inline-flex items-center gap-1 text-[0.8125rem] text-muted-foreground">
          <Clock className="size-3.5" aria-hidden />
          Due {formatRelative(target, now)}
        </span>
      ) : null}
    </span>
  )
}

const PRIORITY_TONE: Record<MaintenancePriority, string> = {
  LOW: "bg-subtle",
  MEDIUM: "bg-info",
  HIGH: "bg-warning",
  URGENT: "bg-destructive",
}

export function PriorityLabel({
  priority,
  className,
}: {
  priority: MaintenancePriority
  className?: string
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span aria-hidden className={cn("size-2 rounded-full", PRIORITY_TONE[priority])} />
      {PRIORITY_LABEL[priority]}
    </span>
  )
}
