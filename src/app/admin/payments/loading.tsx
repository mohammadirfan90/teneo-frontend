import { AdminListSkeleton } from "@/features/admin/skeletons"

export default function Loading() {
  return <AdminListSkeleton filters={false} sections={2} rows={4} cols={5} />
}
