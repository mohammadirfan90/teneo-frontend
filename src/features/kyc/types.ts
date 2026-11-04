import type { ISODateTime, Uuid } from "@/types/api"

export type KycRole = "TENANT" | "OWNER"

/** POST /documents response (backend-api.md §5). */
export interface UploadedDocumentView {
  id: Uuid
  ownerUserId: Uuid
  objectKey: string
  contentType: string
  sizeBytes: string
  label: string | null
  status: "ACTIVE" | "SOFT_DELETED"
  storageProvider: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
  downloadUrl: string
  expiresAt: ISODateTime
}

/** Mirrors the backend upload rules for documents. */
export const KYC_MAX_FILES = 3
export const KYC_MAX_BYTES = 15 * 1024 * 1024
export const KYC_ACCEPT = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const

export const KYC_DOC_TYPES: Record<KycRole, Array<{ value: string; label: string }>> = {
  TENANT: [
    { value: "national-id", label: "National ID card" },
    { value: "passport", label: "Passport" },
    { value: "driving-licence", label: "Driving licence" },
    { value: "student-or-work-id", label: "Student or employee ID" },
  ],
  OWNER: [
    { value: "national-id", label: "National ID card" },
    { value: "passport", label: "Passport" },
    { value: "driving-licence", label: "Driving licence" },
    { value: "ownership-deed", label: "Property ownership deed" },
    { value: "trade-licence", label: "Trade licence" },
  ],
}

/** SHA-256 of a file as 64 lowercase hex chars (what /kyc/submissions expects in docHash). */
export async function sha256Hex(file: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer())
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("")
}
