import type { ReactNode } from "react"
import { cn } from "cn"

interface PageHeaderProps {
  title: string
  description?: ReactNode
  /** One primary action, optionally a secondary one. */
  actions?: ReactNode
  /** Small line above the title, e.g. a back link. Sentence case, never an uppercase eyebrow. */
  back?: ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, back, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {back && <div className="mb-2 text-sm">{back}</div>}
        <h1 className="text-2xl font-semibold sm:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-prose text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
