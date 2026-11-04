"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

import type { BuildingView, FlatView } from "@/features/owner/types"

/**
 * The API can't list a property's buildings, flats or draft rooms (backend-api.md §10.2).
 * Whatever this browser creates is remembered here so the property page can show
 * draft rooms and offer existing flats when adding more. localStorage, per device.
 */
interface StructureState {
  buildings: Record<string, BuildingView[]>
  flats: Record<string, FlatView[]>
  roomIds: Record<string, string[]>
  rememberBuilding: (propertyId: string, b: BuildingView) => void
  rememberFlat: (propertyId: string, f: FlatView) => void
  rememberRoom: (propertyId: string, roomId: string) => void
}

function upsert<T extends { id: string }>(list: T[] | undefined, item: T): T[] {
  return [...(list ?? []).filter((x) => x.id !== item.id), item]
}

export const useStructure = create<StructureState>()(
  persist(
    (set) => ({
      buildings: {},
      flats: {},
      roomIds: {},
      rememberBuilding: (pid, b) =>
        set((s) => ({ buildings: { ...s.buildings, [pid]: upsert(s.buildings[pid], b) } })),
      rememberFlat: (pid, f) => set((s) => ({ flats: { ...s.flats, [pid]: upsert(s.flats[pid], f) } })),
      rememberRoom: (pid, id) =>
        set((s) => ({ roomIds: { ...s.roomIds, [pid]: [...new Set([...(s.roomIds[pid] ?? []), id])] } })),
    }),
    {
      name: "teneo-owner-structure",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ buildings, flats, roomIds }) => ({ buildings, flats, roomIds }),
    }
  )
)
