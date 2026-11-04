"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

import type { BuildingView, FlatView } from "@/features/owner/types"
import type { PropertyView, RoomView } from "@/types/domain"

export const WIZARD_STEPS = [
  { key: "details", label: "Property", hint: "Address and type" },
  { key: "building", label: "Building", hint: "Name and floors" },
  { key: "flats", label: "Flats", hint: "Units in the building" },
  { key: "rooms", label: "Rooms", hint: "Rent and terms" },
  { key: "photos", label: "Photos", hint: "Show the space" },
  { key: "review", label: "Review", hint: "Publish or save" },
] as const

export type WizardStep = 0 | 1 | 2 | 3 | 4 | 5

/**
 * Every wizard step writes real records to the API as you go, so the wizard only
 * needs to remember what it created. Persisted to sessionStorage so a reload (or an
 * accidental back-navigation) resumes where the owner left off in this tab.
 */
interface WizardState {
  step: WizardStep
  furthest: WizardStep
  property: PropertyView | null
  building: BuildingView | null
  flats: FlatView[]
  rooms: RoomView[]
  photoCounts: Record<string, number>
  /** Set while navigating away after publish/save (not persisted). */
  leaving: boolean
  goTo: (step: WizardStep) => void
  setProperty: (p: PropertyView) => void
  setBuilding: (b: BuildingView) => void
  addFlat: (f: FlatView) => void
  upsertRoom: (r: RoomView) => void
  setPhotoCount: (roomId: string, count: number) => void
  reset: () => void
  /** Clear the wizard and mark it as leaving so it doesn't flash step 1. */
  complete: () => void
  setLeaving: (leaving: boolean) => void
}

const initial = {
  step: 0 as WizardStep,
  furthest: 0 as WizardStep,
  property: null,
  building: null,
  flats: [],
  rooms: [],
  photoCounts: {},
}

export const useWizard = create<WizardState>()(
  persist(
    (set) => ({
      ...initial,
      leaving: false,
      goTo: (step) => set((s) => ({ step, furthest: Math.max(s.furthest, step) as WizardStep })),
      setProperty: (property) => set({ property }),
      setBuilding: (building) => set({ building }),
      addFlat: (flat) => set((s) => ({ flats: [...s.flats.filter((f) => f.id !== flat.id), flat] })),
      upsertRoom: (room) =>
        set((s) => {
          const exists = s.rooms.some((r) => r.id === room.id)
          return { rooms: exists ? s.rooms.map((r) => (r.id === room.id ? room : r)) : [...s.rooms, room] }
        }),
      setPhotoCount: (roomId, count) =>
        set((s) =>
          s.photoCounts[roomId] === count ? s : { photoCounts: { ...s.photoCounts, [roomId]: count } }
        ),
      reset: () => set({ ...initial }),
      complete: () => set({ ...initial, leaving: true }),
      setLeaving: (leaving) => set({ leaving }),
    }),
    {
      name: "teneo-property-wizard",
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ step, furthest, property, building, flats, rooms, photoCounts }) => ({
        step,
        furthest,
        property,
        building,
        flats,
        rooms,
        photoCounts,
      }),
    }
  )
)
