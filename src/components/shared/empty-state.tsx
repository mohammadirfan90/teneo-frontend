import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "cn"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: ReactNode
  /** A single next step. */
  action?: ReactNode
  className?: string
  compact?: boolean
}

export function EmptyState({ icon: Icon, title, description, action, className, compact }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/60 text-center",
        compact ? "px-4 py-8" : "px-6 py-14",
        className
      )}
    >
      <span className="grid size-11 place-items-center rounded-full bg-surface-2 text-muted-foreground">
        <Icon className="size-5" aria-hidden />
      </span>
      <h2 className="mt-4 text-base font-semibold">{title}</h2>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
