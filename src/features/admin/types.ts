// Admin-only view types not covered by src/types. Source: docs/context/backend-api.md §11.1, §11.7, §11.9, §11.11, §11.12.
import type { ISODateTime, MeView, MinorStr, Uuid } from "@/types/api"
import type { InvoiceStatus, PaymentStatus } from "@/types/domain"

export interface UserDetailView extends MeView {
  emailVerifiedAt: ISODateTime | null
  oauthProvider: string | null
  deletedAt: ISODateTime | null
}

export interface DocumentUrlView {
  id: Uuid
  downloadUrl: string
  expiresAt: ISODateTime
}

export interface InvoiceView {
  id: Uuid
  leaseId: Uuid
  periodStart: ISODateTime
  periodEnd: ISODateTime
  totalMinor: MinorStr
  amountPaidMinor: MinorStr
  currency: string
  status: InvoiceStatus
  dueDate: ISODateTime
  baseRentMinor: MinorStr
  utilityShareMinor: MinorStr
  lateFeeMinor: MinorStr
  version: number
  generatedAt: ISODateTime
  disputedAt: ISODateTime | null
  disputeReason: string | null
  waivedAt: ISODateTime | null
  waiveReason: string | null
  createdAt: ISODateTime
  updatedAt: ISODateTime
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
  failureReason: string | null
  cancellationReason: string | null
  paidAt: ISODateTime | null
  failedAt: ISODateTime | null
  refundedAt: ISODateTime | null
  canceledAt: ISODateTime | null
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface RefundResult {
  payment: PaymentView
  refundId: string | null
  note: string
}

export interface TakedownResult {
  id: Uuid
  status: "TAKEN_DOWN"
  rejectedApplications: number
  cancelledViewings: number
}
