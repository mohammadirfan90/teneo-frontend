import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { Skeleton } from "@/components/ui/skeleton"

// Server-safe (no "use client") so server pages like /payment/cancel can pass icon components.

const TONE = {
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-destructive",
  info: "bg-info-soft text-info",
} as const

export function ResultCard({
  icon: Icon,
  tone,
  title,
  body,
  live,
  children,
}: {
  icon: LucideIcon
  tone: keyof typeof TONE
  title: string
  body: string
  live?: boolean
  children?: ReactNode
}) {
  return (
    <section
      className="mx-auto flex w-full max-w-lg flex-col items-start gap-5 rounded-xl border bg-card p-5 sm:p-8"
      aria-live={live ? "polite" : undefined}
    >
      <span className={`grid size-12 place-items-center rounded-full ${TONE[tone]}`}>
        <Icon className="size-6" aria-hidden />
      </span>
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-1.5 text-muted-foreground">{body}</p>
      </div>
      {children}
    </section>
  )
}

export function ResultSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-lg flex-col gap-5 rounded-xl border bg-card p-5 sm:p-8"
      aria-busy
      aria-label="Checking payment"
    >
      <Skeleton className="size-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  )
}
