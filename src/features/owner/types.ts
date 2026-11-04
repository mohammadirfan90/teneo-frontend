// View types used by the owner workspace that aren't in src/types (backend-api.md §5, §11).
import type { ISODate, ISODateTime, MinorStr, Uuid } from "@/types/api"
import type {
  InvoiceStatus,
  InvoiceSummaryView,
  LeaseStatus,
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceStatus,
  UtilityType,
} from "@/types/domain"

type DecimalStr = string

export interface BuildingView {
  id: Uuid
  propertyId: Uuid
  name: string
  floors: number | null
  status: "ACTIVE" | "ARCHIVED"
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface FlatView {
  id: Uuid
  buildingId: Uuid
  floor: number | null
  doorNumber: string | null
  status: "ACTIVE" | "ARCHIVED"
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface RoomPhotoView {
  id: Uuid
  roomId: Uuid
  url: string
  contentType: string
  sizeBytes: string
  width: number | null
  height: number | null
  position: number
  alt: string | null
  createdAt: ISODateTime
}

export interface PublishPropertyResult {
  id: Uuid
  status: "PUBLISHED"
  publishedAt: ISODateTime
  roomsPublished: number
}

export interface LeaseView {
  id: Uuid
  roomId: Uuid
  ownerUserId: Uuid
  primaryTenantUserId: Uuid
  startDate: ISODateTime
  endDate: ISODateTime
  rentMinor: MinorStr
  depositMinor: MinorStr
  currency: string
  utilitySplitMode: "EQUAL" | "PROPORTIONAL" | "CUSTOM"
  status: LeaseStatus
  signedAt: ISODateTime | null
  activatedAt: ISODateTime | null
  endedAt: ISODateTime | null
  contractObjectKey: string | null
  createdAt: ISODateTime
  updatedAt: ISODateTime
  tenants: Array<{
    leaseId: Uuid
    tenantUserId: Uuid
    isPrimary: boolean
    liabilityShare: DecimalStr
    createdAt: ISODateTime
  }>
  signatures: Array<{
    id: Uuid
    leaseId: Uuid
    signerUserId: Uuid
    signerRole: "OWNER" | "TENANT"
    signedAt: ISODateTime
  }>
}

export interface LeaseAmendmentView {
  id: Uuid
  leaseId: Uuid
  proposedByUserId: Uuid
  status: "PROPOSED" | "SIGNED" | "REJECTED"
  payload: unknown
  createdAt: ISODateTime
  signedAt: ISODateTime | null
}

export interface InvoiceView extends InvoiceSummaryView {
  baseRentMinor: MinorStr
  utilityShareMinor: MinorStr
  lateFeeMinor: MinorStr
  version: number
  generatedAt: ISODateTime
  disputedAt: ISODateTime | null
  disputedByUserId: Uuid | null
  disputeReason: string | null
  waivedAt: ISODateTime | null
  waivedByUserId: Uuid | null
  waiveReason: string | null
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export type { InvoiceStatus }

export interface UtilityBillView {
  id: Uuid
  leaseId: Uuid
  meterId: Uuid
  periodStart: ISODate
  periodEnd: ISODate
  previousReadingValue: DecimalStr
  currentReadingValue: DecimalStr
  consumptionUnits: DecimalStr
  totalAmountMinor: MinorStr
  currency: string
  generatedAt: ISODateTime
  superseded: boolean
}

export interface GenerateBillsResult {
  invoice: InvoiceView
  bills: UtilityBillView[]
  shares: unknown[]
}

export interface MeterView {
  id: Uuid
  propertyId: Uuid
  utilityType: UtilityType
  label: string
  ratePerUnitMinor: MinorStr
  currency: string
  unitLabel: string
  isActive: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface ReadingSummary {
  id: Uuid
  meterId: Uuid
  readingDate: ISODate
  readingValue: DecimalStr
}

export interface ReadingView extends ReadingSummary {
  notes: string | null
  submittedByUserId: Uuid
  createdAt: ISODateTime
}

export interface TicketView {
  id: Uuid
  roomId: Uuid
  leaseId: Uuid
  raisedByUserId: Uuid
  title: string
  description: string
  category: MaintenanceCategory
  priority: MaintenancePriority
  status: MaintenanceStatus
  slaTargetAt: ISODateTime
  slaBreachedAt: ISODateTime | null
  resolvedAt: ISODateTime | null
  resolvedByUserId: Uuid | null
  closedAt: ISODateTime | null
  closedByUserId: Uuid | null
  rating: number | null
  ratingComment: string | null
  ratingSubmittedAt: ISODateTime | null
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface TicketUpdateView {
  id: Uuid
  ticketId: Uuid
  authorUserId: Uuid
  body: string
  statusAfter: MaintenanceStatus | null
  createdAt: ISODateTime
}

export interface TicketDetail {
  ticket: TicketView
  updates: TicketUpdateView[]
}
