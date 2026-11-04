import { Badge } from "@/components/ui/badge"
import { humanize } from "@/lib/format"

type Tone = "success" | "warning" | "info" | "danger" | "neutral"

// One tone table for every backend status enum (applications, leases, invoices,
// payments, tickets, rooms, properties, KYC, viewings). Unknown values → neutral.
const TONE: Record<string, Tone> = {
  // positive / done
  APPROVED: "success",
  PUBLISHED: "success",
  ACTIVE: "success",
  SIGNED: "success",
  PAID: "success",
  SUCCEEDED: "success",
  CONFIRMED: "success",
  RESOLVED: "success",
  COMPLETED: "success",
  OCCUPIED: "success",
  MUTUAL: "success",
  // waiting on someone
  SUBMITTED: "info",
  SCREENING: "info",
  VIEWING_SCHEDULED: "info",
  SHORTLISTED: "info",
  REQUESTED: "info",
  PROCESSING: "info",
  ACKNOWLEDGED: "info",
  IN_PROGRESS: "info",
  RESERVED: "info",
  PROPOSED: "info",
  // needs attention
  PENDING: "warning",
  DUE: "warning",
  PARTIALLY_PAID: "warning",
  OPEN: "warning",
  DRAFT: "warning",
  MAINTENANCE: "warning",
  MAINTENANCE_CHECK: "warning",
  DISPUTED: "warning",
  // failed / stopped
  REJECTED: "danger",
  OVERDUE: "danger",
  FAILED: "danger",
  TAKEN_DOWN: "danger",
  TERMINATED: "danger",
  SUSPENDED: "danger",
  DECLINED: "danger",
  // closed / inert
  WITHDRAWN: "neutral",
  CANCELLED: "neutral",
  CANCELED: "neutral",
  CLOSED: "neutral",
  ENDED: "neutral",
  WAIVED: "neutral",
  REFUNDED: "neutral",
  EXPIRED: "neutral",
  ARCHIVED: "neutral",
  DEACTIVATED: "neutral",
  NONE: "neutral",
}

const DOT: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-info",
  danger: "bg-destructive",
  neutral: "bg-subtle",
}

export function statusTone(status: string): Tone {
  return TONE[status] ?? "neutral"
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const tone = statusTone(status)
  return (
    <Badge variant={tone} className="h-6 gap-1.5 rounded-md px-2 font-medium">
      <span aria-hidden className={`size-1.5 rounded-full ${DOT[tone]}`} />
      {label ?? humanize(status)}
    </Badge>
  )
}
