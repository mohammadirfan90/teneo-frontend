"use client"

import { useSyncExternalStore } from "react"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

import type { ViewingView } from "@/types/domain"
import type { LeaseAmendmentView } from "./types"

/**
 * The API has no endpoint that lists viewings or lease amendments: their ids are
 * only returned by the create call. We keep what this browser created so the owner
 * can follow up (confirm a slot, sign an amendment). Stored in localStorage.
 */
interface LocalRecords {
  viewings: Record<string, ViewingView[]>
  amendments: Record<string, LeaseAmendmentView[]>
  saveViewing: (applicationId: string, viewing: ViewingView) => void
  saveAmendment: (leaseId: string, amendment: LeaseAmendmentView) => void
}

function upsert<T extends { id: string }>(list: T[] | undefined, item: T): T[] {
  const rest = (list ?? []).filter((x) => x.id !== item.id)
  return [item, ...rest]
}

export const useLocalRecords = create<LocalRecords>()(
  persist(
    (set) => ({
      viewings: {},
      amendments: {},
      saveViewing: (applicationId, viewing) =>
        set((s) => ({
          viewings: { ...s.viewings, [applicationId]: upsert(s.viewings[applicationId], viewing) },
        })),
      saveAmendment: (leaseId, amendment) =>
        set((s) => ({
          amendments: { ...s.amendments, [leaseId]: upsert(s.amendments[leaseId], amendment) },
        })),
    }),
    {
      name: "teneo-owner-records",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ viewings: s.viewings, amendments: s.amendments }),
    }
  )
)

const subscribeNoop = () => () => {}

/** False during SSR and hydration, true afterwards. Gate persisted-store UI on it. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  )
}
