// Domain view types returned by B7A6. Source: docs/context/backend-api.md §3, §11.
import type { ISODate, ISODateTime, KycStatus, MinorStr, Role, Uuid } from "./api"

type DecimalStr = string

export type PropertyType = "BUILDING" | "VILLA" | "STANDALONE_FLAT"
export type PropertyStatus = "DRAFT" | "PUBLISHED" | "TAKEN_DOWN"
export type RoomType = "PRIVATE" | "SHARED" | "STUDIO" | "ENTIRE_FLAT"
export type RoomStatus =
  "DRAFT" | "PUBLISHED" | "RESERVED" | "OCCUPIED" | "MAINTENANCE_CHECK" | "MAINTENANCE" | "TAKEN_DOWN"
export type ApplicationStatus =
  | "SUBMITTED"
  | "SCREENING"
  | "VIEWING_SCHEDULED"
  | "SHORTLISTED"
  | "APPROVED"
  | "REJECTED"
  | "WITHDRAWN"
  | "CANCELLED"
export type ViewingStatus = "REQUESTED" | "CONFIRMED" | "COMPLETED" | "CANCELLED"
export type LeaseStatus = "DRAFT" | "SIGNED" | "ACTIVE" | "ENDED" | "TERMINATED"
export type InvoiceStatus = "DUE" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "WAIVED" | "DISPUTED"
export type PaymentStatus = "PROCESSING" | "SUCCEEDED" | "FAILED" | "CANCELED" | "REFUNDED"
export type KycSubmissionStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED"
export type MaintenanceCategory =
  "PLUMBING" | "ELECTRICAL" | "APPLIANCE" | "HVAC" | "STRUCTURAL" | "PEST" | "OTHER"
export type MaintenancePriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"
export type MaintenanceStatus =
  "OPEN" | "ACKNOWLEDGED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "CANCELLED" | "DISPUTED"
export type UtilityType = "WATER" | "ELECTRICITY" | "GAS" | "INTERNET"

export const OPEN_APPLICATION_STATUSES: ApplicationStatus[] = [
  "SUBMITTED",
  "SCREENING",
  "VIEWING_SCHEDULED",
  "SHORTLISTED",
]
export const OPEN_TICKET_STATUSES: MaintenanceStatus[] = ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "DISPUTED"]
export const UNPAID_INVOICE_STATUSES: InvoiceStatus[] = ["DUE", "PARTIALLY_PAID", "OVERDUE"]

export interface RoleProfileView {
  userId: Uuid
  displayName: string
  bio: string | null
  avatarObjectKey: string | null
  kycStatus: KycStatus
  kycBadgeGrantedAt: ISODateTime | null
  reputationScore: DecimalStr | null
  updatedAt: ISODateTime
}

export interface KycSubmissionView {
  id: Uuid
  userId: Uuid
  role: Role
  status: KycSubmissionStatus
  documentObjectKeys: string[]
  reviewNotes: string | null
  reviewerUserId: Uuid | null
  decidedAt: ISODateTime | null
  expiresAt: ISODateTime | null
  docHash: string | null
  flaggedForReview: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface PropertyView {
  id: Uuid
  ownerUserId: Uuid
  title: string
  description: string | null
  addressLine1: string
  addressLine2: string | null
  city: string
  area: string | null
  postalCode: string | null
  countryCode: string
  latitude: DecimalStr | null
  longitude: DecimalStr | null
  propertyType: PropertyType
  status: PropertyStatus
  publishedAt: ISODateTime | null
  version: number
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface RoomView {
  id: Uuid
  propertyId: Uuid
  flatId: Uuid | null
  label: string
  roomType: RoomType
  sizeSqft: DecimalStr | null
  maxOccupants: number
  baseRentMinor: MinorStr
  depositMinor: MinorStr
  currency: string
  billsIncluded?: boolean
  amenities: string[]
  status: RoomStatus
  availableFrom: ISODate | null
  minLeaseMonths: number | null
  maxLeaseMonths: number | null
  rules?: string | null
  version: number
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface RoomSearchView {
  id: Uuid
  propertyId: Uuid
  flatId: Uuid | null
  label: string
  roomType: RoomType
  sizeSqft: DecimalStr | null
  maxOccupants: number
  baseRentMinor: MinorStr
  depositMinor: MinorStr
  currency: string
  amenities: string[]
  availableFrom: ISODate | null
  minLeaseMonths: number | null
  maxLeaseMonths: number | null
  version: number
  createdAt: ISODateTime
  property: {
    id: Uuid
    title: string
    city: string
    area: string | null
    countryCode: string
    publishedAt: ISODateTime | null
  }
  flat: { id: Uuid; floor: number | null; doorNumber: string | null; buildingName: string } | null
  owner: { id: Uuid; displayName: string }
}

export interface ApplicationView {
  id: Uuid
  roomId: Uuid
  tenantUserId: Uuid
  message: string | null
  status: ApplicationStatus
  submittedAt: ISODateTime
  decidedAt: ISODateTime | null
  decidedByUserId: Uuid | null
  version: number
  createdAt: ISODateTime
  updatedAt: ISODateTime
  tenant: { id: Uuid; displayName: string }
  property: { id: Uuid; title: string; city: string }
}

export interface ViewingView {
  id: Uuid
  applicationId: Uuid | null
  roomId: Uuid
  tenantUserId: Uuid
  proposedSlots: ISODateTime[]
  confirmedSlot: ISODateTime | null
  status: ViewingStatus
  reason: string | null
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface LeaseSummaryView {
  id: Uuid
  roomId: Uuid
  status: LeaseStatus
  startDate: ISODateTime
  endDate: ISODateTime
  rentMinor: MinorStr
  depositMinor: MinorStr
  currency: string
  role: "OWNER" | "TENANT"
  isPrimary: boolean
  createdAt: ISODateTime
}

export interface InvoiceSummaryView {
  id: Uuid
  leaseId: Uuid
  periodStart: ISODateTime
  periodEnd: ISODateTime
  totalMinor: MinorStr
  amountPaidMinor: MinorStr
  currency: string
  status: InvoiceStatus
  dueDate: ISODateTime
}

export interface PaymentSummaryView {
  id: Uuid
  invoiceId: Uuid
  amountMinor: MinorStr
  refundedAmountMinor: MinorStr
  currency: string
  status: PaymentStatus
  paidAt: ISODateTime | null
  createdAt: ISODateTime
}

export interface TicketSummaryView {
  id: Uuid
  roomId: Uuid
  leaseId: Uuid
  title: string
  category: MaintenanceCategory
  priority: MaintenancePriority
  status: MaintenanceStatus
  slaTargetAt: ISODateTime
  slaBreachedAt: ISODateTime | null
  resolvedAt: ISODateTime | null
  rating: number | null
  createdAt: ISODateTime
}

export interface UserSearchHit {
  id: Uuid
  displayName: string
  email?: string
  phone?: string | null
  roles: Role[]
  kycStatus: KycStatus | null
  createdAt: ISODateTime
  piiRedacted: boolean
}

export interface AuditLogView {
  id: Uuid
  occurredAt: ISODateTime
  actorUserId: Uuid | null
  actorRole: string | null
  action: string
  targetEntityType: string | null
  targetEntityId: Uuid | null
  ipAddress: string | null
  userAgent: string | null
}
