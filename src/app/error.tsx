"use client"

import { RotateCw } from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"

export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-24">
      <h1 className="text-2xl font-semibold">This page didn&apos;t load</h1>
      <p className="mt-2 text-muted-foreground">
        Something failed while loading this page. Trying again usually fixes it. If it keeps happening, the
        service may be down for a moment.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button onClick={retry}>
          <RotateCw /> Try again
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/">Go to home</Link>
        </Button>
      </div>
      {digest && <p className="mt-8 font-mono text-xs text-subtle">Reference: {digest}</p>}
    </main>
  )
}
