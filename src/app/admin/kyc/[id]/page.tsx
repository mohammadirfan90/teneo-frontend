import { ArrowLeft, FileText, Flag, MessageSquareMore } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { ReactNode } from "react"

import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { KycReviewActions } from "@/features/admin/kyc-actions"
import { OpenDocument } from "@/features/admin/open-document"
import type { UserDetailView } from "@/features/admin/types"
import { isApiError } from "@/lib/api/errors"
import { api } from "@/lib/api/server"
import { ROLE_LABEL } from "@/lib/auth/roles"
import { formatDate, formatDateTime } from "@/lib/format"
import type { Page } from "@/types/api"
import type { KycSubmissionView, UserSearchHit } from "@/types/domain"

export const metadata: Metadata = { title: "Review KYC submission" }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.8125rem] text-muted-foreground">{label}</dt>
      <dd className="mt-1 wrap-break-word">{children}</dd>
    </div>
  )
}

export default async function KycReviewPage(props: PageProps<"/admin/kyc/[id]">) {
  const { id } = await props.params
  if (!UUID.test(id)) notFound()

  const submission = await api<KycSubmissionView>(`/kyc/submissions/${id}`).catch((e: unknown) => {
    if (isApiError(e) && e.status === 404) notFound()
    throw e
  })

  const [user, hit] = await Promise.all([
    api<UserDetailView>(`/admin/users/${submission.userId}`).catch((e: unknown) => {
      if (isApiError(e) && e.status === 404) return null
      throw e
    }),
    api<Page<UserSearchHit>>("/admin/users/search", { query: { q: submission.userId, limit: 1 } }).then(
      (p) => p.items.find((u) => u.id === submission.userId) ?? null
    ),
  ])

  const applicant = hit?.displayName || user?.email || "Unknown applicant"
  const pending = submission.status === "PENDING"

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={
          <Link
            href="/admin/kyc"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> KYC queue
          </Link>
        }
        title={applicant}
        description={`${ROLE_LABEL[submission.role]} verification, submitted ${formatDateTime(submission.createdAt)}`}
      />

      {submission.flaggedForReview && (
        <Alert variant="destructive">
          <Flag />
          <AlertTitle>Document used by another account</AlertTitle>
          <AlertDescription>
            The fingerprint of these files matches a submission from a different user. Check the documents
            closely before approving.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="applicant" className="rounded-xl border bg-card p-4 sm:p-5">
            <h2 id="applicant" className="mb-4 font-semibold">
              Applicant
            </h2>
            <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <Fact label="Name">
                {user ? (
                  <Link
                    href={`/admin/users/${submission.userId}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {applicant}
                  </Link>
                ) : (
                  applicant
                )}
              </Fact>
              <Fact label="Email">{user?.email ?? "—"}</Fact>
              <Fact label="Account status">{user ? <StatusBadge status={user.status} /> : "Not found"}</Fact>
              <Fact label="Email verified">
                {user?.emailVerifiedAt ? formatDate(user.emailVerifiedAt) : "Not verified"}
              </Fact>
              <Fact label="Roles">
                {user?.roles.length ? user.roles.map((r) => ROLE_LABEL[r]).join(", ") : "None"}
              </Fact>
              <Fact label="Joined">{user ? formatDate(user.createdAt) : "—"}</Fact>
            </dl>
          </section>

          <section aria-labelledby="documents" className="rounded-xl border bg-card p-4 sm:p-5">
            <h2 id="documents" className="font-semibold">
              Documents
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Links are signed for 15 minutes and open in a new tab.
            </p>
            {submission.documentObjectKeys.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No documents were attached.</p>
            ) : (
              <ul className="mt-4 divide-y rounded-lg border">
                {submission.documentObjectKeys.map((key, i) => (
                  <li key={key} className="flex items-start justify-between gap-3 px-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <div className="min-w-0">
                        <p className="font-medium">Document {i + 1}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">{key}</p>
                      </div>
                    </div>
                    {UUID.test(key) ? (
                      <OpenDocument documentId={key} />
                    ) : (
                      <span className="shrink-0 text-right text-[0.8125rem] text-muted-foreground">
                        Not a stored document
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside
          aria-labelledby="decision"
          className="flex flex-col gap-4 self-start rounded-xl border bg-card p-4 sm:p-5"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 id="decision" className="font-semibold">
              Decision
            </h2>
            <StatusBadge status={submission.status} />
          </div>
          {submission.reviewNotes && (
            <div className="rounded-lg bg-surface-2 p-3 text-sm">
              <p className="flex items-center gap-1.5 font-medium">
                <MessageSquareMore className="size-4" aria-hidden />
                {pending ? "Information requested" : "Reviewer notes"}
              </p>
              <p className="mt-1 whitespace-pre-line text-muted-foreground">{submission.reviewNotes}</p>
            </div>
          )}
          {pending ? (
            <>
              <p className="text-sm text-muted-foreground">
                Approving unlocks publishing (owners) or applying (tenants). Notes are required for every
                action and are kept on the submission.
              </p>
              <KycReviewActions id={submission.id} applicant={applicant} />
            </>
          ) : (
            <dl className="grid gap-3 text-sm">
              <Fact label="Decided">{formatDateTime(submission.decidedAt)}</Fact>
              {submission.expiresAt && <Fact label="Valid until">{formatDate(submission.expiresAt)}</Fact>}
            </dl>
          )}
        </aside>
      </div>
    </div>
  )
}
