"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { BookmarkPlus } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { TextField } from "@/components/shared/form-fields"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { parseRoomFilters, toSearchQuery } from "@/features/rooms/query"
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"

// Mirrors B7A6: name 1..80, unique per user (409).
const schema = z.object({
  name: z.string().trim().min(1, "Give the search a name").max(80, "Use at most 80 characters"),
})
type Values = z.infer<typeof schema>

/**
 * Saves the current /rooms filters (URL) as a saved search (POST /search/saved).
 * Tenant-only; render it where useSearchParams is available (inside <Suspense>).
 */
export function SaveSearchButton({ defaultName }: { defaultName?: string }) {
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: defaultName ?? "" } })

  const save = useMutation({
    meta: { silent: true },
    mutationFn: (v: Values) => {
      const filters = parseRoomFilters(Object.fromEntries(searchParams.entries()))
      const query = toSearchQuery({ ...filters, cursor: undefined })
      const clean = Object.fromEntries(
        Object.entries(query).filter(([key, val]) => val !== undefined && key !== "cursor" && key !== "limit")
      )
      return apiClient.post("/search/saved", { name: v.name, query: clean })
    },
    onSuccess: () => {
      setOpen(false)
      form.reset()
      toast.success("Search saved", { description: "Find it under Profile & KYC." })
    },
    onError: (e) => {
      if (isApiError(e) && e.status === 409)
        form.setError("name", { message: "You already have a search with this name" })
      else if (isApiError(e) && e.status === 401) toast.error("Sign in to save searches.")
      else form.setError("name", { message: isApiError(e) ? e.userMessage : "Couldn't save. Try again." })
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) form.reset()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="h-9">
          <BookmarkPlus /> Save search
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save this search</DialogTitle>
          <DialogDescription>Rerun it later from your profile with one click.</DialogDescription>
        </DialogHeader>
        <form id="save-search-form" noValidate onSubmit={form.handleSubmit((v) => save.mutate(v))}>
          <TextField control={form.control} name="name" label="Name" placeholder="Gulshan under ৳30,000" />
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form="save-search-form" loading={save.isPending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
