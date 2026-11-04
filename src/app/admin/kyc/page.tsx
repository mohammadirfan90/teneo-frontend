import type { Metadata } from "next"

import { PageHeader } from "@/components/shared/page-header"
import { KycQueue, type QueueItem } from "@/features/admin/kyc-queue"
import { fetchEach } from "@/features/admin/server"
import { api } from "@/lib/api/server"
import type { Page } from "@/types/api"
import type { KycSubmissionView, UserSearchHit } from "@/types/domain"

export const metadata: Metadata = { title: "KYC review" }

export default async function AdminKycPage() {
  const queue = await api<Page<KycSubmissionView>>("/kyc/queue", { query: { limit: 100 } })

  // The queue only carries userId; names come from an exact-id user search.
  const userIds = [...new Set(queue.items.map((s) => s.userId))]
  const hits = await fetchEach<Page<UserSearchHit>>(userIds, (id) => `/admin/users/search?q=${id}&limit=1`)
  const names = new Map(hits.flatMap((p) => p.items).map((u) => [u.id, u.displayName]))

  const items: QueueItem[] = queue.items
    .map((s) => ({ ...s, applicantName: names.get(s.userId) ?? null }))
    // Flagged (document hash reused by another account) first, then oldest first.
    .sort(
      (a, b) =>
        Number(b.flaggedForReview) - Number(a.flaggedForReview) || a.createdAt.localeCompare(b.createdAt)
    )

  const flagged = items.filter((s) => s.flaggedForReview).length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="KYC review"
        description={
          items.length === 0
            ? "Identity submissions waiting for a decision."
            : `${items.length}${queue.nextCursor ? "+" : ""} pending${
                flagged ? `, ${flagged} flagged because the same document was used by another account` : ""
              }. Flagged first, then oldest first.`
        }
      />
      <KycQueue items={items} />
    </div>
  )
}
