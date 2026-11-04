// Shapes of the B7A6 API. Source of truth: docs/context/backend-api.md.

export type Uuid = string
/** ISO-8601 UTC timestamp, e.g. "2026-11-05T10:20:30.123Z". */
export type ISODateTime = string
/** "YYYY-MM-DD". */
export type ISODate = string
/** BigInt money in minor units, serialized as a decimal string ("75000" = 750.00). */
export type MinorStr = string

export interface ApiSuccess<T> {
  success: true
  message: string
  data: T
}

export interface ApiFieldError {
  field: string
  code: string
  message: string
}

export interface ApiFailure {
  success: false
  message: string
  errors: ApiFieldError[]
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure

/** Cursor page returned by most list endpoints (no total count). */
export interface Page<T> {
  items: T[]
  nextCursor: string | null
  hasMore?: boolean
}

export const ROLES = ["TENANT", "OWNER", "ADMIN"] as const
export type Role = (typeof ROLES)[number]

export type UserStatus = "ACTIVE" | "SUSPENDED" | "DEACTIVATED"
export type Gender = "FEMALE" | "MALE" | "NONBINARY" | "UNDISCLOSED"
export type KycStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED"

export interface AuthUser {
  id: Uuid
  email: string
  roles: Role[]
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: AuthUser
}

export interface MeView {
  id: Uuid
  email: string
  gender: Gender | null
  phone: string | null
  status: UserStatus
  roles: Role[]
  kycStatus: { tenant: KycStatus; owner: KycStatus } | null
  createdAt: ISODateTime
}
