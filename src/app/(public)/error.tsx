"use client"

import { SegmentError } from "@/components/shared/segment-error"

export default function Error(props: { error: unknown; retry: () => void }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <SegmentError {...props} />
    </div>
  )
}
