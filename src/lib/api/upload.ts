"use client"

import type { ApiEnvelope } from "@/types/api"
import { ApiError, isFailureBody } from "./errors"

export interface UploadOptions {
  /** Extra multipart text fields (e.g. alt, label). */
  fields?: Record<string, string>
  /** 0–100, called as bytes leave the browser. */
  onProgress?: (percent: number) => void
  signal?: AbortSignal
  /** Required by some routes (documents); harmless elsewhere. */
  idempotencyKey?: string
}

/**
 * Multipart upload through /api/proxy with progress events (fetch can't report
 * upload progress). The backend expects a single file part named `file`.
 */
export function uploadFile<T>(path: string, file: File, opts: UploadOptions = {}): Promise<T> {
  const form = new FormData()
  form.append("file", file)
  for (const [k, v] of Object.entries(opts.fields ?? {})) form.append(k, v)

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", `/api/proxy/${path.replace(/^\/+/, "")}`)
    xhr.setRequestHeader("Accept", "application/json")
    xhr.setRequestHeader("Idempotency-Key", opts.idempotencyKey ?? crypto.randomUUID())

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress?.(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onerror = () => reject(new ApiError(0, "Upload failed. Check your connection and try again."))
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"))
    xhr.onload = () => {
      let body: ApiEnvelope<T> | null = null
      try {
        body = JSON.parse(xhr.responseText) as ApiEnvelope<T>
      } catch {
        body = null
      }
      if (body?.success) return resolve(body.data)
      if (isFailureBody(body)) {
        const err = ApiError.fromFailure(xhr.status, body)
        if (err.code === "STORAGE_DISABLED" || xhr.status === 503)
          return reject(
            new ApiError(503, "File storage is not configured on the server right now.", err.errors)
          )
        return reject(err)
      }
      reject(
        new ApiError(
          xhr.status,
          xhr.status >= 500 ? "The upload service is unavailable right now." : "Upload failed."
        )
      )
    }

    opts.signal?.addEventListener("abort", () => xhr.abort())
    xhr.send(form)
  })
}
