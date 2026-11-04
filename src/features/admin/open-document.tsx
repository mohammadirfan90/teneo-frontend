"use client"

import { useMutation } from "@tanstack/react-query"
import { AlertCircle, ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import type { DocumentUrlView } from "./types"

function describe(e: unknown): string {
  if (!isApiError(e)) return "Couldn't reach the server."
  if (e.status === 404) return "No document with this id. It may have been uploaded elsewhere."
  if (e.status === 410) return "The applicant deleted this document."
  if (e.status === 503) return "File storage isn't configured on the server right now."
  if (e.status >= 500) return "File storage failed to sign a link. Try again later."
  return e.userMessage
}

/**
 * Fetches a 15-minute signed link and opens it in a new tab. The tab is opened synchronously
 * (so popup blockers allow it) and pointed at the file once the link arrives.
 */
export function OpenDocument({ documentId }: { documentId: string }) {
  const open = useMutation({
    meta: { silent: true },
    mutationFn: () => apiClient.get<DocumentUrlView>(`/documents/${documentId}/url`),
  })

  const onClick = () => {
    const tab = window.open("", "_blank")
    open.mutate(undefined, {
      onSuccess: (doc) => {
        if (tab) {
          tab.opener = null
          tab.location.href = doc.downloadUrl
        } else {
          window.location.assign(doc.downloadUrl)
        }
      },
      onError: () => tab?.close(),
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="outline" onClick={onClick} loading={open.isPending}>
        <ExternalLink /> Open
      </Button>
      {open.isError && (
        <p role="alert" className="flex items-center gap-1 text-right text-[0.8125rem] text-destructive">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden /> {describe(open.error)}
        </p>
      )}
    </div>
  )
}
