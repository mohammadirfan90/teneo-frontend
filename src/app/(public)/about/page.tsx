import type { Metadata } from "next"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { PageIntro } from "@/features/marketing/page-intro"

export const metadata: Metadata = {
  title: "About",
  description:
    "Teneo brings room listings, identity checks, leases, rent and repairs into one place for renters and owners in Bangladesh.",
  openGraph: { title: "About Teneo", description: "Why we built a calmer way to rent." },
}

const PROBLEMS = [
  {
    title: "Listings scattered everywhere",
    body: "Rooms are posted across Facebook groups, classifieds and broker chats. Renters cross-check the same flat in five places and still can't tell who's behind it.",
  },
  {
    title: "No trust on either side",
    body: "Renters worry about fake listings and lost deposits; owners worry about late rent and damage. Nobody's identity is checked.",
  },
  {
    title: "Tenancies run on chat threads",
    body: "Rent is chased by phone, utility bills are split in spreadsheets and repair requests get lost in messages. When there's a dispute, there's no record.",
  },
]

const PRINCIPLES = [
  {
    title: "Verified people only",
    body: "Owners verify before they publish; renters verify before they apply. Admins review every submission.",
  },
  {
    title: "One shared record",
    body: "Applications, the signed lease, invoices, payments and repair tickets live in one place that both sides can see.",
  },
  {
    title: "No surprises in money",
    body: "Rent and deposit are on the listing, invoices show exactly what's due, and card payments are confirmed by Stripe.",
  },
]

export default function AboutPage() {
  return (
    <main>
      <PageIntro
        title="A calmer way to rent a room"
        lead="Teneo is a housing platform for renters, roommates and property owners in Bangladesh. It covers the whole tenancy: finding a room, agreeing terms, paying rent and keeping the place in good repair."
      />
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-16 px-4 py-14 sm:px-6">
        <section aria-labelledby="problem">
          <h2 id="problem" className="text-xl font-semibold">
            The problem we&apos;re solving
          </h2>
          <dl className="mt-6 grid gap-8 md:grid-cols-3">
            {PROBLEMS.map((p) => (
              <div key={p.title}>
                <dt className="font-semibold">{p.title}</dt>
                <dd className="mt-1.5 leading-relaxed text-muted-foreground">{p.body}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section aria-labelledby="principles" className="rounded-2xl border bg-card p-6 sm:p-10">
          <h2 id="principles" className="text-xl font-semibold">
            How we approach it
          </h2>
          <ul className="mt-6 divide-y">
            {PRINCIPLES.map((p) => (
              <li
                key={p.title}
                className="grid gap-1 py-4 first:pt-0 last:pb-0 sm:grid-cols-[200px_1fr] sm:gap-6"
              >
                <span className="font-medium">{p.title}</span>
                <span className="leading-relaxed text-muted-foreground">{p.body}</span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="cta" className="flex flex-col items-start gap-4">
          <h2 id="cta" className="text-xl font-semibold">
            See it for yourself
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Browse the rooms that are live right now, or sign in with one of the demo accounts to see the
            tenant, owner and admin workspaces.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/rooms">Browse rooms</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/login">Try a demo account</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  )
}
