import type {
  ApplicationStatus,
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceStatus,
  RoomStatus,
  UtilityType,
} from "@/types/domain"

/**
 * Owner-side application moves, exactly per the backend state machine (backend-api.md §3).
 * SCREENING → VIEWING_SCHEDULED happens by proposing viewing slots, not by a plain transition.
 */
export const APPLICATION_OWNER_NEXT: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
  SUBMITTED: ["SCREENING", "REJECTED"],
  SCREENING: ["SHORTLISTED", "REJECTED"],
  VIEWING_SCHEDULED: ["SHORTLISTED", "REJECTED", "CANCELLED"],
  SHORTLISTED: ["APPROVED", "REJECTED"],
}

export const APPLICATION_ACTION_LABEL: Partial<Record<ApplicationStatus, string>> = {
  SCREENING: "Start screening",
  SHORTLISTED: "Shortlist",
  APPROVED: "Approve",
  REJECTED: "Reject",
  CANCELLED: "Cancel application",
}

/** Intended owner ticket matrix (the backend doesn't enforce it, so the UI does). */
export const TICKET_OWNER_NEXT: Partial<Record<MaintenanceStatus, MaintenanceStatus>> = {
  OPEN: "ACKNOWLEDGED",
  ACKNOWLEDGED: "IN_PROGRESS",
  IN_PROGRESS: "RESOLVED",
  RESOLVED: "CLOSED",
  DISPUTED: "RESOLVED",
}

export const TICKET_ACTION_LABEL: Partial<Record<MaintenanceStatus, string>> = {
  ACKNOWLEDGED: "Acknowledge",
  IN_PROGRESS: "Start work",
  RESOLVED: "Mark resolved",
  CLOSED: "Close ticket",
}

/** Room moves an owner may make (DRAFT → PUBLISHED goes through /publish, which is KYC-gated). */
export const ROOM_OWNER_NEXT: Partial<Record<RoomStatus, RoomStatus[]>> = {
  DRAFT: ["PUBLISHED"],
  PUBLISHED: ["MAINTENANCE"],
  MAINTENANCE: ["PUBLISHED"],
  MAINTENANCE_CHECK: ["PUBLISHED"],
}

export const ROOM_ACTION_LABEL: Record<string, string> = {
  "DRAFT>PUBLISHED": "Publish room",
  "PUBLISHED>MAINTENANCE": "Pause for maintenance",
  "MAINTENANCE>PUBLISHED": "Back on the market",
  "MAINTENANCE_CHECK>PUBLISHED": "Checked — relist",
}

export const PRIORITY_LABEL: Record<MaintenancePriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
}

export const SLA_HOURS: Record<MaintenancePriority, number> = { LOW: 168, MEDIUM: 72, HIGH: 24, URGENT: 4 }

export const CATEGORY_LABEL: Record<MaintenanceCategory, string> = {
  PLUMBING: "Plumbing",
  ELECTRICAL: "Electrical",
  APPLIANCE: "Appliance",
  HVAC: "Heating & cooling",
  STRUCTURAL: "Structural",
  PEST: "Pest control",
  OTHER: "Other",
}

export const UTILITY_LABEL: Record<UtilityType, string> = {
  WATER: "Water",
  ELECTRICITY: "Electricity",
  GAS: "Gas",
  INTERNET: "Internet",
}

export const UTILITY_UNIT: Record<UtilityType, string> = {
  WATER: "m³",
  ELECTRICITY: "kWh",
  GAS: "m³",
  INTERNET: "GB",
}

/** Short id for display, e.g. "1fc80e16". */
export function shortId(id: string): string {
  return id.slice(0, 8)
}
