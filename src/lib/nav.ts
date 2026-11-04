import {
  BadgeCheck,
  Building2,
  ClipboardList,
  FileSignature,
  FileText,
  Gauge,
  Home,
  ReceiptText,
  ScrollText,
  Search,
  ShieldCheck,
  Users,
  UserRound,
  UsersRound,
  Wrench,
  type LucideIcon,
} from "lucide-react"

import type { Role } from "@/types/api"

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** Match only the exact path (overview pages). */
  exact?: boolean
}

export interface NavGroup {
  label?: string
  items: NavItem[]
}

export const APP_NAV: Record<Role, NavGroup[]> = {
  TENANT: [
    {
      items: [
        { href: "/dashboard", label: "Overview", icon: Home, exact: true },
        { href: "/rooms", label: "Find a room", icon: Search },
        { href: "/dashboard/applications", label: "Applications", icon: ClipboardList },
        { href: "/dashboard/lease", label: "My lease", icon: FileSignature },
      ],
    },
    {
      label: "Living here",
      items: [
        { href: "/dashboard/payments", label: "Rent & bills", icon: ReceiptText },
        { href: "/dashboard/tickets", label: "Maintenance", icon: Wrench },
        { href: "/dashboard/roommates", label: "Roommates", icon: UsersRound },
      ],
    },
    { items: [{ href: "/dashboard/profile", label: "Profile & KYC", icon: UserRound }] },
  ],
  OWNER: [
    {
      items: [
        { href: "/owner", label: "Overview", icon: Home, exact: true },
        { href: "/owner/properties", label: "Properties", icon: Building2 },
        { href: "/owner/applications", label: "Applications", icon: ClipboardList },
        { href: "/owner/leases", label: "Leases", icon: FileSignature },
      ],
    },
    {
      label: "Operations",
      items: [
        { href: "/owner/billing", label: "Billing & earnings", icon: ReceiptText },
        { href: "/owner/tickets", label: "Maintenance", icon: Wrench },
      ],
    },
    { items: [{ href: "/owner/profile", label: "Profile & KYC", icon: UserRound }] },
  ],
  ADMIN: [
    {
      items: [
        { href: "/admin", label: "Overview", icon: Gauge, exact: true },
        { href: "/admin/users", label: "Users", icon: Users },
        { href: "/admin/kyc", label: "KYC review", icon: BadgeCheck },
        { href: "/admin/listings", label: "Listings", icon: ShieldCheck },
      ],
    },
    {
      label: "Records",
      items: [
        { href: "/admin/payments", label: "Invoices & refunds", icon: FileText },
        { href: "/admin/audit", label: "Audit log", icon: ScrollText },
      ],
    },
  ],
}

export const PUBLIC_NAV: NavItem[] = [
  { href: "/rooms", label: "Find a room", icon: Search },
  { href: "/how-it-works", label: "How it works", icon: FileSignature },
  { href: "/owners", label: "For owners", icon: Building2 },
  { href: "/faq", label: "FAQ", icon: ScrollText },
]

export function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}
