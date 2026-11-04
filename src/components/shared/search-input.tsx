"use client"

import { Loader2, Search, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { cn } from "cn"

import { Input } from "@/components/ui/input"
import { useDebounce } from "@/hooks/use-debounce"
import { useUrlState } from "@/hooks/use-url-state"

interface SearchInputProps {
  /** URL param to sync, default "q". */
  param?: string
  placeholder?: string
  label?: string
  className?: string
  delayMs?: number
}

/** Debounced search box bound to a URL param. Needs a <Suspense> ancestor. */
export function SearchInput({
  param = "q",
  placeholder = "Search",
  label = "Search",
  className,
  delayMs = 350,
}: SearchInputProps) {
  const { get, set, isPending } = useUrlState()
  const urlValue = get(param)
  const [value, setValue] = useState(urlValue)
  const debounced = useDebounce(value, delayMs)
  const lastPushed = useRef(urlValue)

  // Push debounced edits to the URL.
  useEffect(() => {
    if (debounced === lastPushed.current) return
    lastPushed.current = debounced
    set({ [param]: debounced.trim() || null })
  }, [debounced, param, set])

  // Follow external URL changes (back/forward, "clear filters").
  useEffect(() => {
    if (urlValue !== lastPushed.current) {
      lastPushed.current = urlValue
      setValue(urlValue)
    }
  }, [urlValue])

  return (
    <div className={cn("relative", className)}>
      <label htmlFor={`search-${param}`} className="sr-only">
        {label}
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
      <Input
        id={`search-${param}`}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
        autoComplete="off"
      />
      {isPending ? (
        <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-subtle" />
      ) : (
        value && (
          <button
            type="button"
            onClick={() => setValue("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-md text-subtle hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )
      )}
    </div>
  )
}
