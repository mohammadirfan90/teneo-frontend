import type { Metadata, Viewport } from "next"
import { Geist_Mono, Instrument_Sans } from "next/font/google"
import { Providers } from "@/components/providers"
import "./globals.css"

const sans = Instrument_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
})

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Teneo — rooms, roommates and rent in one place",
    template: "%s · Teneo",
  },
  description:
    "Find a verified room, match with compatible roommates, sign the lease and pay rent online. Teneo connects tenants and property owners from search to move-in.",
  applicationName: "Teneo",
  openGraph: {
    type: "website",
    siteName: "Teneo",
    locale: "en_US",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#111110" },
  ],
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
