import { ArrowLeft, ScrollText } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { ReactNode } from "react"

import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DeactivateUser } from "@/features/admin/deactivate-user"
import type { UserDetailView } from "@/features/admin/types"
import { isApiError } from "@/lib/api/errors"
import { api, getMe } from "@/lib/api/server"
import { ROLE_LABEL } from "@/lib/auth/roles"
import { formatDate, formatDateTime } from "@/lib/format"
import type { Page } from "@/types/api"
import type { UserSearchHit } from "@/types/domain"

export const metadata: Metadata = { title: "User details" }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.8125rem] text-muted-foreground">{label}</dt>
      <dd className="mt-1 wrap-break-word">{children}</dd>
    </div>
  )
}

export default async function AdminUserPage(props: PageProps<"/admin/users/[id]">) {
  const { id } = await props.params
  if (!UUID.test(id)) notFound()

  const [user, hit, me] = await Promise.all([
    api<UserDetailView>(`/admin/users/${id}`).catch((e: unknown) => {
      if (isApiError(e) && e.status === 404) notFound()
      throw e
    }),
    // Display name + profile KYC come from search (exact id match). Deactivated users aren't searchable.
    api<Page<UserSearchHit>>("/admin/users/search", { query: { q: id, limit: 1 } }).then(
      (p) => p.items.find((u) => u.id === id) ?? null
    ),
    getMe(),
  ])

  const isSelf = me.id === user.id
  const deactivated = user.status === "DEACTIVATED" || user.deletedAt !== null
  const name = deactivated ? "Deactivated account" : hit?.displayName || user.email

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Users
          </Link>
        }
        title={name}
        description={
          <span className="font-mono text-[0.8125rem]" title="User id">
            {user.id}
          </span>
        }
        actions={
          <Button variant="outline" asChild>
            <Link href={`/admin/audit?actor=${user.id}`}>
              <ScrollText /> Their activity
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section aria-label="Account" className="rounded-xl border bg-card p-4 sm:p-5">
          <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <Fact label="Status">
              <StatusBadge status={user.status} />
            </Fact>
            <Fact label="Roles">
              {user.roles.length ? (
                <span className="flex flex-wrap gap-1">
                  {user.roles.map((r) => (
                    <Badge key={r} variant="neutral">
                      {ROLE_LABEL[r]}
                    </Badge>
                  ))}
                </span>
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </Fact>
            <Fact label="Email">{user.email}</Fact>
            <Fact label="Email verified">
              {user.emailVerifiedAt ? (
                formatDate(user.emailVerifiedAt)
              ) : (
                <span className="text-muted-foreground">Not verified</span>
              )}
            </Fact>
            <Fact label="Phone">
              {user.phone ?? <span className="text-muted-foreground">Not given</span>}
            </Fact>
            <Fact label="Sign-in">
              {user.oauthProvider ? `Google (${user.oauthProvider})` : "Email and password"}
            </Fact>
            <Fact label="Tenant KYC">
              {user.kycStatus ? (
                <StatusBadge status={user.kycStatus.tenant} />
              ) : (
                <span className="text-muted-foreground">No profile</span>
              )}
            </Fact>
            <Fact label="Owner KYC">
              {user.kycStatus ? (
                <StatusBadge status={user.kycStatus.owner} />
              ) : (
                <span className="text-muted-foreground">No profile</span>
              )}
            </Fact>
            <Fact label="Joined">{formatDateTime(user.createdAt)}</Fact>
            {user.deletedAt && <Fact label="Deactivated">{formatDateTime(user.deletedAt)}</Fact>}
          </dl>
        </section>

        <aside
          aria-labelledby="danger"
          className="flex flex-col gap-3 self-start rounded-xl border bg-card p-4 sm:p-5"
        >
          <h2 id="danger" className="font-semibold">
            Deactivate account
          </h2>
          {deactivated ? (
            <p className="text-sm text-muted-foreground">
              This account was deactivated{user.deletedAt ? ` on ${formatDate(user.deletedAt)}` : ""}. Its
              personal details have been removed and it can no longer sign in.
            </p>
          ) : isSelf ? (
            <p className="text-sm text-muted-foreground">
              This is your own account. Another admin has to deactivate it.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Stops this person signing in and anonymises their email, phone and password. Leases, invoices
                and tickets stay on record. The backend doesn&apos;t write an audit entry for this action.
              </p>
              <div>
                <DeactivateUser userId={user.id} email={user.email} />
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
