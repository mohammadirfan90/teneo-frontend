// Tenant-workspace view types that src/types/domain.ts doesn't cover.
// Source: docs/context/backend-api.md §11.
import type { Gender, ISODate, ISODateTime, MinorStr, Uuid } from "@/types/api"
import type {
  InvoiceStatus,
  InvoiceSummaryView,
  LeaseStatus,
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceStatus,
  PaymentStatus,
  UtilityType,
} from "@/types/domain"

type DecimalStr = string

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

export const PAYABLE_INVOICE_STATUSES: InvoiceStatus[] = ["DUE", "PARTIALLY_PAID", "OVERDUE", "DISPUTED"]

export interface BillSummaryView {
  id: Uuid
  leaseId: Uuid
  meterId: Uuid
  meterUtilityType: UtilityType
  meterLabel: string
  periodStart: ISODate
  periodEnd: ISODate
  totalAmountMinor: MinorStr
  currency: string
  generatedAt: ISODateTime
  superseded: boolean
}

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

export interface BillShareView {
  id: Uuid
  billId: Uuid
  tenantUserId: Uuid
  shareMinor: MinorStr
  splitMode: string
  weightUsed: DecimalStr | null
  createdAt: ISODateTime
}

export interface PaymentView {
  id: Uuid
  invoiceId: Uuid
  leaseId: Uuid
  tenantUserId: Uuid
  gateway: "STRIPE"
  gatewayPaymentIntentId: string | null
  gatewayChargeId: string | null
  gatewayRefundId: string | null
  amountMinor: MinorStr
  refundedAmountMinor: MinorStr
  currency: string
  status: PaymentStatus
  idempotencyKey: string
  failureCode: string | null
  failureReason: string | null
  cancellationReason: string | null
  paidAt: ISODateTime | null
  failedAt: ISODateTime | null
  refundedAt: ISODateTime | null
  canceledAt: ISODateTime | null
  version: number
  createdAt: ISODateTime
  updatedAt: ISODateTime
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

/** Backend SearchQuery as stored on a saved search (amenities parsed to an array). */
export interface SavedSearchQuery {
  city?: string
  q?: string
  rent_min?: number
  rent_max?: number
  currency?: string
  amenities?: string[] | string
  available_from?: string
  sort?: "relevance" | "newest" | "price_asc" | "price_desc"
  limit?: number
}

export interface SavedSearchView {
  id: Uuid
  userId: Uuid
  name: string
  query: SavedSearchQuery
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export type Visibility = "PUBLIC" | "MATCHES_ONLY" | "PRIVATE"

export interface PreferencesView {
  userId: Uuid
  budgetMinMinor: MinorStr | null
  budgetMaxMinor: MinorStr | null
  preferredCities: string[]
  moveInFrom: ISODate | null
  moveInTo: ISODate | null
  lifestyle: Record<string, unknown> | null
  interests: string[]
  visibility: Visibility
  updatedAt: ISODateTime
}

export interface MatchResultView {
  matchId: Uuid
  rank: number
  score: number
  breakdown: {
    lifestyle: number
    budget: number
    city: number
    moveIn: number
    interests: number
    base: number
  }
  explain: string
  hardPenalties: string[]
  candidate: {
    userId: Uuid
    displayName: string
    gender: Gender | null
    preferredCities: string[]
    interests: string[]
    contactRevealed: boolean
  }
}

export interface MatchResultPage {
  summary: { ranAt: ISODateTime | ""; candidateCount: number; topN: number }
  items: MatchResultView[]
}

export interface IntroRequestView {
  id: Uuid
  matchId: Uuid
  callerUserId: Uuid
  candidateUserId: Uuid
  callerAcceptedAt: ISODateTime | null
  candidateAcceptedAt: ISODateTime | null
  revealedAt: ISODateTime | null
  declinedAt: ISODateTime | null
  status: "PENDING" | "MUTUAL" | "DECLINED"
  counterpartDisplayName: string
  createdAt: ISODateTime
}
