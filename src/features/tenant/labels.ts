// Plain (non-client) module so Server Components can read these maps too.
import type {
  ApplicationStatus,
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceStatus,
} from "@/types/domain"

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  SUBMITTED: "Submitted",
  SCREENING: "Screening",
  VIEWING_SCHEDULED: "Viewing scheduled",
  SHORTLISTED: "Shortlisted",
  APPROVED: "Approved",
  REJECTED: "Not selected",
  WITHDRAWN: "Withdrawn",
  CANCELLED: "Cancelled",
}

export const APPLICATION_STATUSES = Object.keys(APPLICATION_STATUS_LABEL) as ApplicationStatus[]

export const TICKET_STATUS_LABEL: Record<MaintenanceStatus, string> = {
  OPEN: "Open",
  ACKNOWLEDGED: "Acknowledged",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
  DISPUTED: "Disputed",
}

export const CATEGORY_LABEL: Record<MaintenanceCategory, string> = {
  PLUMBING: "Plumbing",
  ELECTRICAL: "Electrical",
  APPLIANCE: "Appliance",
  HVAC: "Heating & cooling",
  STRUCTURAL: "Structural",
  PEST: "Pests",
  OTHER: "Other",
}

export const PRIORITY_LABEL: Record<MaintenancePriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
}

export const PRIORITY_HINT: Record<MaintenancePriority, string> = {
  LOW: "Response within 7 days",
  MEDIUM: "Response within 3 days",
  HIGH: "Response within 24 hours",
  URGENT: "Response within 4 hours (safety, no water or power)",
}
