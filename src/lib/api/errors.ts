import type { ApiFailure, ApiFieldError } from "@/types/api"

/**
 * Error thrown for any non-2xx backend response. The backend's machine-readable
 * code lives in `errors[0].code` (there is no top-level code).
 */
export class ApiError extends Error {
  readonly status: number
  readonly errors: ApiFieldError[]

  constructor(status: number, message: string, errors: ApiFieldError[] = []) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.errors = errors
  }

  static fromFailure(status: number, body: ApiFailure): ApiError {
    return new ApiError(status, body.message, body.errors ?? [])
  }

  get code(): string | undefined {
    return this.errors[0]?.code
  }

  /** Field-level messages keyed by dotted path, skipping synthetic "unknown"/"body" entries. */
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {}
    for (const e of this.errors) {
      if (e.field === "unknown" || e.field === "body") continue
      out[e.field] ??= e.message
    }
    return out
  }

  /** Best single human-readable message for a toast. */
  get userMessage(): string {
    if (this.status === 429) return "Too many requests. Please wait a moment and try again."
    if (this.status >= 500) return "Something went wrong on our side. Please try again."
    const first = this.errors.find((e) => e.field !== "unknown" && e.field !== "body")
    return first && this.message.startsWith("Invalid") ? first.message : this.message
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError
}

export function isFailureBody(body: unknown): body is ApiFailure {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as { success?: unknown }).success === false
  )
}
