"use client"

import { create } from "zustand"

import { EMPTY_DRAFT, type PreferencesDraft } from "./schema"

interface RoommateDraftState {
  /** Which saved preferences version the draft started from ("" = none saved). */
  source: string | null
  step: number
  draft: PreferencesDraft
  /** Replace the draft with saved preferences unless the user is mid-edit of the same version. */
  hydrate: (source: string, draft: PreferencesDraft) => void
  update: (patch: Partial<PreferencesDraft>) => void
  setStep: (step: number) => void
  reset: (source: string, draft: PreferencesDraft) => void
}

/** Wizard draft survives step changes and client navigation within the session. */
export const useRoommateDraft = create<RoommateDraftState>((set, get) => ({
  source: null,
  step: 0,
  draft: EMPTY_DRAFT,
  hydrate: (source, draft) => {
    if (get().source === source) return
    set({ source, draft, step: 0 })
  },
  update: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  setStep: (step) => set({ step }),
  reset: (source, draft) => set({ source, draft, step: 0 }),
}))
