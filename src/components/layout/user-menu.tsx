"use client"

import { LayoutDashboard, LogOut, UserRound } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ROLE_LABEL, homeFor } from "@/lib/auth/roles"
import { initials } from "@/lib/format"
import type { Role } from "@/types/api"

export function UserMenu({ email, role }: { email: string; role: Role | null }) {
  const [signingOut, setSigningOut] = useState(false)

  async function signOut() {
    setSigningOut(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } finally {
      // Full navigation clears the client router cache of signed-in pages.
      window.location.replace("/login")
    }
  }

  const profileHref = role === "TENANT" ? "/dashboard/profile" : role === "OWNER" ? "/owner/profile" : null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-1.5" aria-label="Account menu">
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {initials(email)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-40 truncate text-sm font-normal text-muted-foreground lg:inline">
            {email}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{email}</p>
          <p className="text-xs text-muted-foreground">{role ? ROLE_LABEL[role] : "No role yet"}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={homeFor(role)}>
            <LayoutDashboard /> Dashboard
          </Link>
        </DropdownMenuItem>
        {profileHref && (
          <DropdownMenuItem asChild>
            <Link href={profileHref}>
              <UserRound /> Profile & KYC
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault()
            void signOut()
          }}
          disabled={signingOut}
        >
          <LogOut /> {signingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
