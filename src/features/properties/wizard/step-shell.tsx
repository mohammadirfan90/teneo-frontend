"use client"

import { ArrowLeft } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"

/** Card body for one wizard step with a consistent back / continue footer. */
export function StepShell({
  title,
  description,
  children,
  onBack,
  primary,
  aside,
}: {
  title: string
  description?: ReactNode
  children: ReactNode
  onBack?: () => void
  /** The step's main action (submit or continue). */
  primary?: ReactNode
  /** Secondary footer content, e.g. "Skip for now". */
  aside?: ReactNode
}) {
  return (
    <section aria-labelledby="step-title" className="rounded-xl border bg-card">
      <header className="border-b px-4 py-4 sm:px-6">
        <h2 id="step-title" className="text-lg font-semibold">
          {title}
        </h2>
        {description && <p className="mt-1 max-w-prose text-sm text-muted-foreground">{description}</p>}
      </header>
      <div className="px-4 py-5 sm:px-6 sm:py-6">{children}</div>
      {(onBack || primary || aside) && (
        <footer className="flex flex-col-reverse gap-2 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            {onBack && (
              <Button type="button" variant="ghost" onClick={onBack}>
                <ArrowLeft /> Back
              </Button>
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            {aside}
            {primary}
          </div>
        </footer>
      )}
    </section>
  )
}
