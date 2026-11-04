"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  Loader2,
  RotateCw,
  Star,
  Trash2,
  X,
} from "lucide-react"
import Image from "next/image"
import { useEffect, useId, useRef, useState, type DragEvent } from "react"
import { toast } from "sonner"
import { cn } from "cn"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import { uploadFile } from "@/lib/api/upload"
import type { RoomPhotoView } from "@/features/owner/types"

const MAX_PHOTOS = 20
const MAX_BYTES = 8 * 1024 * 1024
const TYPES = ["image/jpeg", "image/png", "image/webp"]

interface Upload {
  key: string
  file: File
  preview: string
  progress: number
  status: "uploading" | "error"
  error?: string
}

export function describeUploadError(e: unknown): string {
  if (!isApiError(e)) return "The upload didn't finish. Try again."
  if (e.status === 0) return e.message
  if (e.status === 413) return "This photo is larger than 8 MB."
  if (e.code === "PHOTO_LIMIT_REACHED") return "This room already has 20 photos. Remove one first."
  if (e.code === "UNSUPPORTED_MEDIA_TYPE" || e.code === "CONTENT_TYPE_MISMATCH")
    return "Only JPEG, PNG or WebP images can be uploaded."
  if (e.status === 503) return "Photo storage isn't configured on the server right now. Nothing was saved."
  if (e.status >= 500)
    return `The server couldn't store this photo (error ${e.status}). Nothing was saved — try again later.`
  if (e.status === 403) return "You can only add photos to your own rooms."
  return e.message
}

export const photosKey = (roomId: string) => ["room-photos", roomId] as const

/**
 * Photo gallery manager for one room: upload with progress and preview,
 * reorder (cover = position 0) and delete. Server errors are shown per photo.
 */
export function PhotoManager({
  roomId,
  roomLabel,
  onCountChange,
}: {
  roomId: string
  roomLabel: string
  onCountChange?: (count: number) => void
}) {
  const qc = useQueryClient()
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploads, setUploads] = useState<Upload[]>([])
  const [rejected, setRejected] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)

  const photos = useQuery({
    queryKey: photosKey(roomId),
    queryFn: ({ signal }) => apiClient.get<RoomPhotoView[]>(`/rooms/${roomId}/photos`, undefined, signal),
  })
  const list = photos.data ?? []

  const onCountRef = useRef(onCountChange)
  useEffect(() => {
    onCountRef.current = onCountChange
  }, [onCountChange])
  useEffect(() => {
    if (photos.data) onCountRef.current?.(photos.data.length)
  }, [photos.data])

  // Revoke preview URLs on unmount.
  const uploadsRef = useRef(uploads)
  useEffect(() => {
    uploadsRef.current = uploads
  }, [uploads])
  useEffect(() => () => uploadsRef.current.forEach((u) => URL.revokeObjectURL(u.preview)), [])

  const patchUpload = (key: string, patch: Partial<Upload>) =>
    setUploads((us) => us.map((u) => (u.key === key ? { ...u, ...patch } : u)))

  const removeUpload = (key: string) =>
    setUploads((us) => {
      const u = us.find((x) => x.key === key)
      if (u) URL.revokeObjectURL(u.preview)
      return us.filter((x) => x.key !== key)
    })

  const start = async (u: Upload) => {
    patchUpload(u.key, { status: "uploading", progress: 0, error: undefined })
    try {
      const photo = await uploadFile<RoomPhotoView>(`/rooms/${roomId}/photos`, u.file, {
        fields: { alt: `${roomLabel}`.slice(0, 300) },
        onProgress: (p) => patchUpload(u.key, { progress: p }),
      })
      qc.setQueryData<RoomPhotoView[]>(photosKey(roomId), (old) => [...(old ?? []), photo])
      removeUpload(u.key)
      toast.success("Photo added")
    } catch (e) {
      patchUpload(u.key, { status: "error", error: describeUploadError(e) })
    }
  }

  const addFiles = (files: FileList | File[]) => {
    const problems: string[] = []
    const room = MAX_PHOTOS - list.length - uploads.length
    const accepted: Upload[] = []
    for (const file of Array.from(files)) {
      if (!TYPES.includes(file.type)) problems.push(`${file.name}: only JPEG, PNG or WebP`)
      else if (file.size > MAX_BYTES) problems.push(`${file.name}: larger than 8 MB`)
      else if (accepted.length >= room)
        problems.push(`${file.name}: a room can have at most ${MAX_PHOTOS} photos`)
      else
        accepted.push({
          key: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          progress: 0,
          status: "uploading",
        })
    }
    setRejected(problems)
    if (!accepted.length) return
    setUploads((us) => [...us, ...accepted])
    accepted.forEach((u) => void start(u))
  }

  const reorder = useMutation({
    mutationFn: ({ photoId, position }: { photoId: string; position: number }) =>
      apiClient.post<RoomPhotoView[]>(`/rooms/${roomId}/photos/${photoId}/reorder`, { position }),
    onMutate: async ({ photoId, position }) => {
      await qc.cancelQueries({ queryKey: photosKey(roomId) })
      const previous = qc.getQueryData<RoomPhotoView[]>(photosKey(roomId))
      if (previous) {
        const moving = previous.find((p) => p.id === photoId)
        const rest = previous.filter((p) => p.id !== photoId)
        if (moving) rest.splice(position, 0, moving)
        qc.setQueryData(
          photosKey(roomId),
          rest.map((p, i) => ({ ...p, position: i }))
        )
      }
      return { previous }
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(photosKey(roomId), ctx.previous),
    onSuccess: (gallery) => qc.setQueryData(photosKey(roomId), gallery),
  })

  const remove = useMutation({
    mutationFn: (photoId: string) => apiClient.delete(`/rooms/${roomId}/photos/${photoId}`),
    onSuccess: (_d, photoId) => {
      qc.setQueryData<RoomPhotoView[]>(photosKey(roomId), (old) =>
        (old ?? []).filter((p) => p.id !== photoId).map((p, i) => ({ ...p, position: i }))
      )
      toast.success("Photo removed")
    },
  })

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
  }

  const full = list.length + uploads.length >= MAX_PHOTOS

  return (
    <div className="flex flex-col gap-4">
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-card px-4 py-6 text-center transition-colors duration-150 hover:border-input has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40",
          dragging && "border-primary bg-primary/[0.04]",
          full && "pointer-events-none opacity-50"
        )}
      >
        <ImagePlus className="size-5 text-subtle" aria-hidden />
        <span className="text-sm font-medium">Drop photos here or choose files</span>
        <span className="text-[0.8125rem] text-muted-foreground">
          JPEG, PNG or WebP · up to 8 MB each · {list.length}/{MAX_PHOTOS} used
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={TYPES.join(",")}
          multiple
          disabled={full}
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files)
            e.target.value = ""
          }}
        />
      </label>

      {rejected.length > 0 && (
        <ul className="flex flex-col gap-1 text-[0.8125rem] text-destructive" role="alert">
          {rejected.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}

      {photos.isPending ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-lg" />
          ))}
        </div>
      ) : photos.isError ? (
        <p className="text-sm text-destructive">Couldn&apos;t load this room&apos;s photos.</p>
      ) : list.length === 0 && uploads.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No photos yet. Rooms with photos get noticeably more applications.
        </p>
      ) : (
        <ul
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          aria-label={`Photos of ${roomLabel}`}
        >
          {list.map((p, i) => (
            <li key={p.id} className="group relative overflow-hidden rounded-lg border bg-surface-2">
              <div className="relative aspect-[4/3]">
                <Image
                  src={p.url}
                  alt={p.alt ?? roomLabel}
                  fill
                  sizes="(min-width: 1024px) 220px, 45vw"
                  className="object-cover"
                />
                {i === 0 && (
                  <span className="absolute top-2 left-2 rounded-md bg-card/95 px-1.5 py-0.5 text-xs font-medium shadow-sm">
                    Cover
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1 border-t bg-card p-1">
                <div className="flex gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Move earlier"
                    disabled={i === 0 || reorder.isPending}
                    onClick={() => reorder.mutate({ photoId: p.id, position: i - 1 })}
                  >
                    <ArrowLeft />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Move later"
                    disabled={i === list.length - 1 || reorder.isPending}
                    onClick={() => reorder.mutate({ photoId: p.id, position: i + 1 })}
                  >
                    <ArrowRight />
                  </Button>
                  {i !== 0 && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Make cover photo"
                      disabled={reorder.isPending}
                      onClick={() => reorder.mutate({ photoId: p.id, position: 0 })}
                    >
                      <Star />
                    </Button>
                  )}
                </div>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon-sm" aria-label="Delete photo">
                      <Trash2 />
                    </Button>
                  }
                  title="Delete this photo?"
                  description="It is removed from the listing straight away."
                  confirmLabel="Delete photo"
                  destructive
                  pending={remove.isPending}
                  onConfirm={() => remove.mutateAsync(p.id)}
                />
              </div>
            </li>
          ))}

          {uploads.map((u) => (
            <li key={u.key} className="relative overflow-hidden rounded-lg border bg-surface-2">
              <div className="relative aspect-[4/3]">
                <Image
                  src={u.preview}
                  alt={`Preview of ${u.file.name}`}
                  fill
                  unoptimized
                  className={cn("object-cover", u.status === "uploading" && "opacity-60")}
                />
                {u.status === "uploading" && (
                  <div className="absolute inset-x-2 bottom-2 rounded-md bg-card/95 p-2 shadow-sm">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="size-3 animate-spin" aria-hidden />
                        {u.progress < 100 ? "Uploading" : "Processing"}
                      </span>
                      <span className="tabular-nums">{u.progress}%</span>
                    </div>
                    <Progress value={u.progress} className="mt-1.5" aria-label={`Uploading ${u.file.name}`} />
                  </div>
                )}
              </div>
              {u.status === "error" && (
                <div className="flex flex-col gap-2 border-t bg-card p-2" role="alert">
                  <p className="flex items-start gap-1.5 text-xs text-destructive">
                    <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
                    <span>{u.error}</span>
                  </p>
                  <div className="flex gap-1">
                    <Button size="xs" variant="outline" onClick={() => void start(u)}>
                      <RotateCw /> Retry
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => removeUpload(u.key)}>
                      <X /> Discard
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
