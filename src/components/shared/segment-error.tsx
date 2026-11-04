"use client"

import { RotateCw } from "lucide-react"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"

/** Error boundary body for workspace segments: keeps the shell, explains, offers a retry. */
export function SegmentError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null

  return (
    <div role="alert" className="flex flex-col items-start gap-4 rounded-xl border bg-card p-6 sm:p-8">
      <div>
        <h1 className="text-xl font-semibold">This section couldn&apos;t load</h1>
        <p className="mt-1.5 max-w-prose text-muted-foreground">
          We couldn&apos;t reach the Teneo service or it returned an error. Your data is safe — try again in a
          moment.
        </p>
      </div>
      <Button onClick={retry}>
        <RotateCw /> Try again
      </Button>
      {digest && <p className="font-mono text-xs text-subtle">Reference: {digest}</p>}
    </div>
  )
}
