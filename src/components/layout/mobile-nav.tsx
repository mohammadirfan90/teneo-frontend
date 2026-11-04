"use client"

import { Menu } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "cn"

import { LogoMark } from "@/components/shared/logo"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { PUBLIC_NAV, isActive } from "@/lib/nav"
import type { Role } from "@/types/api"
import { SidebarNav } from "./nav-links"

/** Hamburger + left sheet: the role's workspace nav, or the public links when no role is given. */
export function MobileNav({ role, title = "Menu" }: { role?: Role; title?: string }) {
  const items = role ? null : PUBLIC_NAV
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <LogoMark /> {title}
          </SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto px-3 py-4">
          {role && <SidebarNav role={role} onNavigate={() => setOpen(false)} />}
          {items && (
            <ul className="flex flex-col gap-0.5">
              {items.map((item) => {
                const Icon = item.icon
                const active = isActive(pathname, item)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-11 items-center gap-3 rounded-md px-3 text-[0.9375rem] text-muted-foreground hover:bg-muted hover:text-foreground",
                        active && "bg-muted font-medium text-foreground"
                      )}
                    >
                      <Icon className="size-4 text-subtle" aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
