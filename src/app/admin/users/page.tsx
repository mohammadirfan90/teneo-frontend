import { UserSearch } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { CursorPagination } from "@/components/shared/cursor-pagination"
import { DataTable } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { UserFilters } from "@/features/admin/user-filters"
import { api } from "@/lib/api/server"
import { ROLE_LABEL } from "@/lib/auth/roles"
import { formatDate } from "@/lib/format"
import { str, type RawSearchParams } from "@/lib/search-params"
import type { Page } from "@/types/api"
import type { UserSearchHit } from "@/types/domain"

export const metadata: Metadata = { title: "Users" }

const ROLE_FILTERS = ["TENANT", "OWNER", "ADMIN", "NONE"] as const

function matchesRole(u: UserSearchHit, role: string | undefined) {
  if (!role) return true
  if (role === "NONE") return u.roles.length === 0
  return (u.roles as string[]).includes(role)
}

export default async function AdminUsersPage(props: PageProps<"/admin/users">) {
  const sp: RawSearchParams = await props.searchParams
  const q = str(sp, "q")?.slice(0, 120)
  const roleParam = str(sp, "role")
  const role = (ROLE_FILTERS as readonly string[]).includes(roleParam ?? "") ? roleParam : undefined
  const reveal = str(sp, "pii") === "1"

  const page = await api<Page<UserSearchHit>>("/admin/users/search", {
    query: { q: q ?? "@", limit: 20, revealPii: reveal ? "true" : undefined, cursor: str(sp, "cursor") },
  })
  const rows = page.items.filter((u) => matchesRole(u, role))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        description="Find an account by name, email, phone or id. Contact details stay hidden unless you reveal them."
      />

      <Suspense fallback={<Skeleton className="h-[132px] rounded-xl" />}>
        <UserFilters />
      </Suspense>

      {role && page.items.length > 0 && (
        <p className="text-sm text-muted-foreground">
          The role filter narrows the current page of search results ({rows.length} of {page.items.length}).
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={UserSearch}
          title={q || role ? "No accounts match" : "No accounts yet"}
          description={
            q
              ? "Search matches part of an email, phone or display name, or a complete user id."
              : role
                ? "No account on this page has that role. Try the next page or another role."
                : undefined
          }
          action={
            q || role ? (
              <Button variant="outline" asChild>
                <Link href="/admin/users">Clear search</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          caption="User accounts"
          rows={rows}
          rowKey={(u) => u.id}
          mobileAside={(u) => (u.kycStatus ? <StatusBadge status={u.kycStatus} /> : null)}
          columns={[
            {
              key: "name",
              header: "Name",
              cell: (u) => (
                <div className="min-w-0">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                    prefetch={false}
                  >
                    {u.displayName || "Unnamed account"}
                  </Link>
                  {reveal && (
                    <p className="truncate text-[0.8125rem] text-muted-foreground">
                      {u.email ?? "—"}
                      {u.phone ? ` · ${u.phone}` : ""}
                    </p>
                  )}
                </div>
              ),
            },
            {
              key: "roles",
              header: "Roles",
              cell: (u) =>
                u.roles.length ? (
                  <span className="flex flex-wrap gap-1">
                    {u.roles.map((r) => (
                      <Badge key={r} variant="neutral">
                        {ROLE_LABEL[r]}
                      </Badge>
                    ))}
                  </span>
                ) : (
                  <span className="text-muted-foreground">None</span>
                ),
            },
            {
              key: "kyc",
              header: "KYC",
              cell: (u) => (u.kycStatus ? <StatusBadge status={u.kycStatus} /> : "No profile"),
              hideOnMobile: true,
            },
            { key: "joined", header: "Joined", cell: (u) => formatDate(u.createdAt) },
          ]}
        />
      )}

      <CursorPagination
        basePath="/admin/users"
        searchParams={sp}
        nextCursor={page.nextCursor}
        itemCount={rows.length}
      />
    </div>
  )
}
