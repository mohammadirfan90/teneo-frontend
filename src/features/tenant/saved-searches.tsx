"use client"

import { useMutation } from "@tanstack/react-query"
import { ArrowRight, BookmarkX, Search, Trash2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import { formatDate } from "@/lib/format"
import { describeSavedSearch, savedSearchHref } from "./saved-search"
import type { SavedSearchView } from "./types"

/** Saved searches with optimistic delete (removed at once, restored if the API refuses). */
export function SavedSearches({ initial, hasMore }: { initial: SavedSearchView[]; hasMore: boolean }) {
  const [items, setItems] = useState(initial)

  const remove = useMutation({
    meta: { silent: true },
    mutationFn: (s: SavedSearchView) => apiClient.delete<{ id: string }>(`/search/saved/${s.id}`),
    onMutate: (s) => {
      const index = items.findIndex((x) => x.id === s.id)
      setItems((cur) => cur.filter((x) => x.id !== s.id))
      return { index }
    },
    onSuccess: (_d, s) => toast.success(`Removed “${s.name}”`),
    onError: (e, s, ctx) => {
      setItems((cur) => {
        if (cur.some((x) => x.id === s.id)) return cur
        const next = [...cur]
        next.splice(Math.min(ctx?.index ?? 0, next.length), 0, s)
        return next
      })
      toast.error(isApiError(e) ? e.userMessage : "Couldn't remove the search. Try again.")
    },
  })

  if (items.length === 0) {
    return (
      <EmptyState
        compact
        icon={BookmarkX}
        title="No saved searches"
        description="Searches you save show up here so you can rerun them in one click."
        action={
          <Button asChild variant="outline">
            <Link href="/rooms">
              <Search /> Search rooms
            </Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="divide-y rounded-xl border bg-card">
        {items.map((s) => (
          <li key={s.id} className="flex items-center gap-3 px-4 py-3">
            <Link href={savedSearchHref(s.query)} className="group min-w-0 flex-1 rounded-md">
              <p className="flex items-center gap-1.5 font-medium group-hover:underline">
                <span className="truncate">{s.name}</span>
                <ArrowRight className="size-3.5 shrink-0 text-subtle" aria-hidden />
              </p>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {describeSavedSearch(s.query)} · saved {formatDate(s.createdAt)}
              </p>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Delete saved search ${s.name}`}
              onClick={() => remove.mutate(s)}
            >
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
      {hasMore && <p className="text-sm text-muted-foreground">Showing your 20 most recent searches.</p>}
    </div>
  )
}
