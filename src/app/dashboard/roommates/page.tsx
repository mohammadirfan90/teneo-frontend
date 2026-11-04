import type { Metadata } from "next"

import { PageHeader } from "@/components/shared/page-header"
import { getFacets } from "@/features/rooms/data"
import { RoommatesWorkspace } from "@/features/tenant/roommates/roommates-workspace"
import type { MatchResultPage, PreferencesView } from "@/features/tenant/types"
import { api } from "@/lib/api/server"
import { isApiError } from "@/lib/api/errors"

export const metadata: Metadata = { title: "Roommates" }

export default async function RoommatesPage() {
  const [preferences, results, facets] = await Promise.all([
    api<PreferencesView>("/preferences/tenant").catch((e: unknown) => {
      if (isApiError(e) && e.status === 404) return null
      throw e
    }),
    api<MatchResultPage>("/match/results"),
    getFacets().catch(() => ({ cities: [] as string[] })),
  ])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Roommates"
        description="Find tenants whose budget, dates and habits fit yours, then ask for an introduction."
      />
      <RoommatesWorkspace
        initialPreferences={preferences}
        initialResults={results}
        citySuggestions={facets.cities}
      />
    </div>
  )
}
