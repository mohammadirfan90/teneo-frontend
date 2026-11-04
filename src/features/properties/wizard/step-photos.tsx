"use client"

import { ArrowRight, ChevronDown } from "lucide-react"
import { useState } from "react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { PhotoManager } from "../photo-manager"
import { useWizard } from "../wizard-store"
import { StepShell } from "./step-shell"

export function StepPhotos() {
  const rooms = useWizard((s) => s.rooms)
  const counts = useWizard((s) => s.photoCounts)
  const setCount = useWizard((s) => s.setPhotoCount)
  const goTo = useWizard((s) => s.goTo)
  const [open, setOpen] = useState<string | null>(rooms[0]?.id ?? null)

  return (
    <StepShell
      title="Photos"
      description="Add photos for each room. The first photo is the cover. Photos are optional here — you can add or reorder them later from the property page."
      onBack={() => goTo(3)}
      primary={
        <Button type="button" onClick={() => goTo(5)}>
          Review listing <ArrowRight />
        </Button>
      }
    >
      <ul className="flex flex-col gap-3">
        {rooms.map((room) => {
          const isOpen = open === room.id
          const count = counts[room.id]
          return (
            <li key={room.id} className="rounded-lg border">
              <Collapsible open={isOpen} onOpenChange={(o) => setOpen(o ? room.id : null)}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
                  >
                    <span className="font-medium">{room.label}</span>
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      {count === undefined ? "" : count === 1 ? "1 photo" : `${count} photos`}
                      <ChevronDown
                        className={cn("size-4 transition-transform duration-150", isOpen && "rotate-180")}
                        aria-hidden
                      />
                    </span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="border-t px-4 py-4">
                  <PhotoManager
                    roomId={room.id}
                    roomLabel={room.label}
                    onCountChange={(n) => setCount(room.id, n)}
                  />
                </CollapsibleContent>
              </Collapsible>
            </li>
          )
        })}
      </ul>
    </StepShell>
  )
}
