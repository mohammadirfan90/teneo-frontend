"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "cn"

import { APP_NAV, PUBLIC_NAV, isActive } from "@/lib/nav"
import type { Role } from "@/types/api"

export function PublicNavLinks() {
  const items = PUBLIC_NAV
  const pathname = usePathname()
  return (
    <ul className="flex items-center gap-1">
      {items.map((item) => {
        const active = isActive(pathname, item)
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-9 items-center rounded-md px-3 text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground",
                active && "font-medium text-foreground"
              )}
            >
              {item.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function SidebarNav({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const groups = APP_NAV[role]
  const pathname = usePathname()
  return (
    <nav aria-label="Workspace" className="flex flex-col gap-5">
      {groups.map((group, gi) => (
        <div key={group.label ?? gi}>
          {group.label && <p className="mb-1.5 px-3 text-xs font-medium text-subtle">{group.label}</p>}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item)
              const Icon = item.icon
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-9 items-center gap-2.5 rounded-md px-3 text-sm text-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-foreground",
                      active &&
                        "bg-sidebar-accent font-medium text-foreground before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary"
                    )}
                  >
                    <Icon className={cn("size-4", active ? "text-primary" : "text-subtle")} aria-hidden />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
