import type { MetadataRoute } from "next"

import { getAllLiveRooms } from "@/features/rooms/data"

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

const STATIC_PAGES = [
  "",
  "/rooms",
  "/how-it-works",
  "/owners",
  "/faq",
  "/about",
  "/contact",
  "/login",
  "/register",
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rooms = await getAllLiveRooms().catch(() => [])
  return [
    ...STATIC_PAGES.map((path) => ({ url: `${site}${path}`, changeFrequency: "weekly" as const })),
    ...rooms.map((r) => ({
      url: `${site}/rooms/${r.id}`,
      lastModified: r.property.publishedAt ?? r.createdAt,
      changeFrequency: "daily" as const,
    })),
  ]
}
