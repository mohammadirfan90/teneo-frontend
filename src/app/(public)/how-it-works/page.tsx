import { BadgeCheck, CreditCard, FileSignature, Wrench } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { HOW_STEPS_OWNER, HOW_STEPS_RENTER } from "@/features/marketing/content"
import { PageIntro, Steps } from "@/features/marketing/page-intro"

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How renting and letting work on Teneo: identity checks, applications and viewings, digital leases, card payments and maintenance.",
  openGraph: { title: "How Teneo works", description: "From search to move-in, step by step." },
}

const DETAILS = [
  {
    icon: BadgeCheck,
    title: "Identity checks on both sides",
    body: "Renters and owners submit an ID document once. An admin reviews it before anyone can apply for or publish a room. Re-used documents are flagged for a closer look.",
  },
  {
    icon: FileSignature,
    title: "One lease, signed by both",
    body: "Approving an application drafts the lease from the listing's rent, deposit and minimum term. It becomes active when both parties have signed and the tenant confirms the move-in.",
  },
  {
    icon: CreditCard,
    title: "Rent by card",
    body: "Invoices are generated per period and paid through Stripe. Payment status updates automatically from Stripe, and refunds are handled by the Teneo team.",
  },
  {
    icon: Wrench,
    title: "Repairs with response targets",
    body: "Tenants raise tickets by category and priority. Owners acknowledge, work on and resolve them; tenants can dispute a fix and rate the result.",
  },
]

export default function HowItWorksPage() {
  return (
    <main>
      <PageIntro
        title="How Teneo works"
        lead="Every step of a tenancy — finding a room, agreeing terms, paying rent and fixing problems — happens in one place, with a record both sides can see."
      />
      <div className="mx-auto grid w-full max-w-4xl gap-14 px-4 py-14 sm:px-6 md:grid-cols-2">
        <section aria-labelledby="renters">
          <h2 id="renters" className="mb-6 text-xl font-semibold">
            If you&apos;re renting
          </h2>
          <Steps steps={HOW_STEPS_RENTER} />
          <Button asChild className="mt-8">
            <Link href="/rooms">Find a room</Link>
          </Button>
        </section>
        <section aria-labelledby="owners">
          <h2 id="owners" className="mb-6 text-xl font-semibold">
            If you own property
          </h2>
          <Steps steps={HOW_STEPS_OWNER} />
          <Button asChild variant="outline" className="mt-8">
            <Link href="/owners">Owner details</Link>
          </Button>
        </section>
      </div>
      <section aria-labelledby="details" className="border-t bg-card/60">
        <div className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6">
          <h2 id="details" className="text-xl font-semibold">
            What happens behind each step
          </h2>
          <dl className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {DETAILS.map((d) => (
              <div key={d.title}>
                <dt className="flex items-center gap-2.5 font-semibold">
                  <d.icon className="size-4 text-primary" aria-hidden />
                  {d.title}
                </dt>
                <dd className="mt-1.5 leading-relaxed text-muted-foreground">{d.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </main>
  )
}
