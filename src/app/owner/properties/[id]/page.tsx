import { ChevronLeft, ExternalLink, MapPin } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { KycCallout } from "@/components/shared/kyc-callout"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { getOwnedProperty } from "@/features/owner/data"
import { discoverPropertyRooms } from "@/features/properties/data"
import { EditPropertyDialog } from "@/features/properties/edit-property-dialog"
import { DeletePropertyButton, PublishPropertyButton } from "@/features/properties/property-actions"
import { RoomsManager } from "@/features/properties/rooms-manager"
import { PROPERTY_TYPE_LABEL } from "@/features/rooms/labels"
import { getMe } from "@/lib/api/server"
import { formatDate } from "@/lib/format"

export async function generateMetadata(props: PageProps<"/owner/properties/[id]">): Promise<Metadata> {
  const { id } = await props.params
  const property = await getOwnedProperty(id)
  return { title: property?.title ?? "Property" }
}

export default async function PropertyDetailPage(props: PageProps<"/owner/properties/[id]">) {
  const { id } = await props.params
  const [me, property] = await Promise.all([getMe(), getOwnedProperty(id)])
  if (!property || property.ownerUserId !== me.id) notFound()

  const kyc = me.kycStatus?.owner ?? "NONE"
  const { rooms, flats } = await discoverPropertyRooms(property)
  const published = property.status === "PUBLISHED"
  const address = [
    property.addressLine1,
    property.addressLine2,
    property.area,
    property.city,
    property.postalCode,
  ]
    .filter(Boolean)
    .join(", ")

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <Link
          href="/owner/properties"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> Properties
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold sm:text-[1.75rem]">{property.title}</h1>
              <StatusBadge status={property.status} />
            </div>
            <p className="mt-1.5 flex items-start gap-1.5 text-muted-foreground">
              <MapPin className="mt-1 size-4 shrink-0" aria-hidden />
              <span>{address}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {property.status === "DRAFT" && kyc === "APPROVED" && (
              <PublishPropertyButton id={property.id} size="default" variant="default" />
            )}
            <EditPropertyDialog property={property} />
            <DeletePropertyButton
              id={property.id}
              title={property.title}
              status={property.status}
              redirectTo="/owner/properties"
              withLabel
            />
          </div>
        </div>
      </header>

      {property.status === "DRAFT" && (
        <KycCallout status={kyc} href="/owner/profile" action="publish this property" />
      )}

      <section aria-labelledby="details" className="rounded-xl border bg-card p-4 sm:p-5">
        <h2 id="details" className="sr-only">
          Details
        </h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm lg:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Kind</dt>
            <dd className="mt-0.5 font-medium">{PROPERTY_TYPE_LABEL[property.propertyType]}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Published</dt>
            <dd className="mt-0.5 font-medium">
              {property.publishedAt ? formatDate(property.publishedAt) : "Not yet"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Added</dt>
            <dd className="mt-0.5 font-medium">{formatDate(property.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Last edited</dt>
            <dd className="mt-0.5 font-medium">{formatDate(property.updatedAt)}</dd>
          </div>
          {property.description && (
            <div className="col-span-2 lg:col-span-4">
              <dt className="text-muted-foreground">Description</dt>
              <dd className="mt-0.5 max-w-prose leading-relaxed">{property.description}</dd>
            </div>
          )}
        </dl>
        {published && rooms.some((r) => r.status === "PUBLISHED") && (
          <Button variant="link" asChild className="mt-4 px-0">
            <Link href={`/rooms?q=${encodeURIComponent(property.title)}`}>
              See it in search <ExternalLink />
            </Link>
          </Button>
        )}
      </section>

      <RoomsManager
        propertyId={property.id}
        propertyTitle={property.title}
        propertyType={property.propertyType}
        propertyPublished={published}
        kycApproved={kyc === "APPROVED"}
        serverRooms={rooms}
        knownFlats={flats}
      />
    </div>
  )
}
