"use client"

import { Images } from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { RoomPhoto } from "./data"

export function RoomGallery({ photos, title }: { photos: RoomPhoto[]; title: string }) {
  const [open, setOpen] = useState(false)
  const [focus, setFocus] = useState(0)
  const [cover, ...rest] = photos
  const side = rest.slice(0, 4)

  const openAt = (i: number) => {
    setFocus(i)
    setOpen(true)
  }

  return (
    <>
      <div
        className={cn(
          "relative grid gap-2 overflow-hidden rounded-xl",
          side.length > 0 ? "md:grid-cols-[2fr_1fr] md:grid-rows-2" : ""
        )}
      >
        <button
          type="button"
          onClick={() => openAt(0)}
          className={cn(
            "relative aspect-[4/3] bg-surface-2 md:aspect-auto",
            side.length > 0 ? "md:row-span-2 md:min-h-[420px]" : "md:aspect-[16/9]"
          )}
          aria-label="Open photo 1"
        >
          <Image
            src={cover.url}
            alt={cover.alt ?? title}
            fill
            preload
            sizes="(min-width: 768px) 66vw, 100vw"
            className="object-cover"
          />
        </button>
        {side.length > 0 && (
          <div className="hidden gap-2 md:row-span-2 md:grid md:grid-cols-2 md:grid-rows-2">
            {side.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => openAt(i + 1)}
                className="relative bg-surface-2"
                aria-label={`Open photo ${i + 2}`}
              >
                <Image src={p.url} alt={p.alt ?? title} fill sizes="17vw" className="object-cover" />
              </button>
            ))}
          </div>
        )}
        {photos.length > 1 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => openAt(0)}
            className="absolute right-3 bottom-3 bg-card/95 shadow-sm"
          >
            <Images /> Show all {photos.length} photos
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90svh] max-w-4xl overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Photo {focus + 1} of {photos.length}
            </DialogDescription>
          </DialogHeader>
          <div className="relative aspect-[3/2] overflow-hidden rounded-lg bg-surface-2">
            <Image
              src={photos[focus].url}
              alt={photos[focus].alt ?? title}
              fill
              sizes="(min-width: 896px) 860px, 100vw"
              className="object-contain"
            />
          </div>
          {photos[focus].alt && <p className="text-sm text-muted-foreground">{photos[focus].alt}</p>}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setFocus(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === focus}
                className={cn(
                  "relative h-16 w-24 shrink-0 overflow-hidden rounded-md border-2",
                  i === focus ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                )}
              >
                <Image src={p.url} alt="" fill sizes="96px" className="object-cover" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
