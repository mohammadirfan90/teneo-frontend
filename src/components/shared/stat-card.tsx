import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "cn"

interface StatCardProps {
  label: string
  value: ReactNode
  /** Short context under the value, e.g. "2 need a decision". */
  hint?: ReactNode
  icon?: LucideIcon
  href?: string
  className?: string
}

export function StatCard({ label, value, hint, icon: Icon, href, className }: StatCardProps) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon && <Icon className="size-4 text-subtle" aria-hidden />}
      </div>
      <p className="mt-2 text-[1.75rem] leading-none font-semibold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-2 text-[0.8125rem] text-muted-foreground">{hint}</p>}
    </>
  )

  const classes = cn("rounded-xl border bg-card p-4 sm:p-5", className)

  if (!href) return <div className={classes}>{body}</div>
  return (
    <Link
      href={href}
      className={cn(classes, "block transition-colors duration-150 hover:border-input hover:bg-card/80")}
    >
      {body}
    </Link>
  )
}
