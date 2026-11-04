import type { Metadata } from "next"

import { PageHeader } from "@/components/shared/page-header"
import { KycPanel } from "@/features/kyc/kyc-panel"
import { AccountForm, TenantProfileForm } from "@/features/tenant/profile-forms"
import { SavedSearches } from "@/features/tenant/saved-searches"
import type { SavedSearchView } from "@/features/tenant/types"
import { api, getMe } from "@/lib/api/server"
import { isApiError } from "@/lib/api/errors"
import type { Page } from "@/types/api"
import type { RoleProfileView } from "@/types/domain"

export const metadata: Metadata = { title: "Profile & KYC" }

async function getTenantProfile(): Promise<RoleProfileView | null> {
  try {
    return await api<RoleProfileView>("/profiles/tenant")
  } catch (e) {
    if (isApiError(e) && e.status === 404) return null
    throw e
  }
}

export default async function TenantProfilePage() {
  const [me, profile, saved] = await Promise.all([
    getMe(),
    getTenantProfile(),
    api<Page<SavedSearchView>>("/search/saved", { query: { limit: 20 } }),
  ])

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Profile & verification"
        description="How owners see you, how to reach you, and your identity check."
      />

      <KycPanel role="TENANT" />

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="profile-heading" className="rounded-xl border bg-card p-4 sm:p-6">
          <h2 id="profile-heading" className="mb-4 text-lg font-semibold">
            Tenant profile
          </h2>
          <TenantProfileForm profile={profile} />
        </section>
        <section aria-labelledby="account-heading" className="rounded-xl border bg-card p-4 sm:p-6">
          <h2 id="account-heading" className="mb-4 text-lg font-semibold">
            Account
          </h2>
          <AccountForm me={me} />
        </section>
      </div>

      <section aria-labelledby="saved-heading" className="flex flex-col gap-3">
        <h2 id="saved-heading" className="text-lg font-semibold">
          Saved searches
        </h2>
        <SavedSearches initial={saved.items} hasMore={Boolean(saved.nextCursor)} />
      </section>
    </div>
  )
}
