import { BadgeCheck } from "lucide-react"
import type { Metadata } from "next"

import { PageHeader } from "@/components/shared/page-header"
import { KycPanel } from "@/features/kyc/kyc-panel"
import { OwnerProfileForm } from "@/features/owner/profile-form"
import { isApiError } from "@/lib/api/errors"
import { api, getMe } from "@/lib/api/server"
import { formatDate } from "@/lib/format"
import type { RoleProfileView } from "@/types/domain"

export const metadata: Metadata = { title: "Profile & KYC" }

async function getOwnerProfile(): Promise<RoleProfileView | null> {
  try {
    return await api<RoleProfileView>("/profiles/owner")
  } catch (e) {
    if (isApiError(e) && e.status === 404) return null
    throw e
  }
}

export default async function OwnerProfilePage() {
  const [me, profile] = await Promise.all([getMe(), getOwnerProfile()])

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Profile & verification"
        description="How tenants see you, and the identity check that lets you publish listings."
      />

      <KycPanel role="OWNER" />

      <section aria-labelledby="profile-heading" className="rounded-xl border bg-card p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="profile-heading" className="text-lg font-semibold">
            Owner profile
          </h2>
          {profile?.kycBadgeGrantedAt && (
            <p className="flex items-center gap-1.5 text-sm text-success">
              <BadgeCheck className="size-4" aria-hidden /> Verified owner since{" "}
              {formatDate(profile.kycBadgeGrantedAt)}
            </p>
          )}
        </div>
        <div className="max-w-2xl">
          <OwnerProfileForm profile={profile} fallbackName={me.email.split("@")[0]} />
        </div>
      </section>
    </div>
  )
}
