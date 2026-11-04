import type { InvoiceStatus, PaymentStatus, UtilityType } from "@/types/domain"

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  DUE: "Due",
  PARTIALLY_PAID: "Partly paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  WAIVED: "Waived",
  DISPUTED: "Disputed",
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PROCESSING: "Not completed",
  SUCCEEDED: "Paid",
  FAILED: "Failed",
  CANCELED: "Cancelled",
  REFUNDED: "Refunded",
}

export const UTILITY_LABEL: Record<UtilityType, string> = {
  WATER: "Water",
  ELECTRICITY: "Electricity",
  GAS: "Gas",
  INTERNET: "Internet",
}

/** Balance still owed on an invoice, in minor units. */
export function balanceMinor(inv: { totalMinor: string; amountPaidMinor: string }): number {
  return Math.max(0, Number(inv.totalMinor) - Number(inv.amountPaidMinor))
}

export function shortId(id: string): string {
  return id.slice(0, 8)
}
