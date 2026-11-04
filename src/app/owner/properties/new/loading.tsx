import { PageHeaderSkeleton } from "@/components/shared/skeletons"
import { WizardSkeleton } from "@/features/properties/wizard/property-wizard"

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton withAction={false} />
      <WizardSkeleton />
    </div>
  )
}
