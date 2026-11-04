import { ChevronLeft } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { KycCallout } from "@/components/shared/kyc-callout"
import { PageHeader } from "@/components/shared/page-header"
import { PropertyWizard } from "@/features/properties/wizard/property-wizard"
import { getMe } from "@/lib/api/server"

export const metadata: Metadata = { title: "Add a property" }

export default async function NewPropertyPage() {
  const me = await getMe()
  const kyc = me.kycStatus?.owner ?? "NONE"

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Add a property"
        description="Six short steps. Each one is saved as you go, so you can stop and come back."
        back={
          <Link
            href="/owner/properties"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" /> Properties
          </Link>
        }
      />
      {kyc === "APPROVED" ? (
        <PropertyWizard kycApproved />
      ) : (
        <KycCallout status={kyc} href="/owner/profile" action="create and publish listings" />
      )}
    </div>
  )
}
