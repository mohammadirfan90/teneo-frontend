"use client"

import { SegmentError } from "@/components/shared/segment-error"

export default function Error(props: { error: unknown; retry: () => void }) {
  return <SegmentError {...props} />
}
