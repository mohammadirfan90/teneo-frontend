import { Building2, ClipboardCheck, Gauge, ReceiptText, Wrench } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { FAQ_OWNERS, HOW_STEPS_OWNER } from "@/features/marketing/content"
import { FaqList } from "@/features/marketing/faq-list"
import { PageIntro, Steps } from "@/features/marketing/page-intro"

export const metadata: Metadata = {
  title: "List your property",
  description:
    "List rooms or whole flats on Teneo. Screen identity-verified applicants, sign digital leases, invoice rent and manage repairs from one dashboard.",
  openGraph: {
    title: "List your property on Teneo",
    description: "Tenants you've checked, rent that arrives.",
  },
}

const TOOLS = [
  {
    icon: Building2,
    title: "Structured listings",
    body: "Model the building, each flat and each room. Set rent, deposit, occupancy, lease length, rules and amenities per room.",
  },
  {
    icon: ClipboardCheck,
    title: "Application inbox",
    body: "Every applicant is identity-verified. Move them through screening, viewings and a shortlist before you decide.",
  },
  {
    icon: ReceiptText,
    title: "Invoices and utilities",
    body: "Generate rent invoices per period. Record meter readings and Teneo splits the utility bill across the lease's tenants.",
  },
  {
    icon: Wrench,
    title: "Maintenance queue",
    body: "Tickets arrive sorted by their response target, so the urgent ones are always at the top.",
  },
  {
    icon: Gauge,
    title: "One overview",
    body: "Published properties, applications waiting on you, active leases and open repairs, on a single screen.",
  },
]

export default function OwnersPage() {
  return (
    <main>
      <PageIntro
        title="Let your rooms to people you've checked"
        lead="Teneo verifies every applicant's identity before they can apply, drafts the lease when you approve someone, and collects rent by card."
      >
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/register?role=owner">Create an owner account</Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="/login">I already have one</Link>
          </Button>
        </div>
      </PageIntro>

      <section aria-labelledby="tools" className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6">
        <h2 id="tools" className="text-xl font-semibold">
          What you get
        </h2>
        <dl className="mt-8 divide-y rounded-xl border bg-card">
          {TOOLS.map((t) => (
            <div key={t.title} className="grid gap-1 p-5 sm:grid-cols-[220px_1fr] sm:gap-6">
              <dt className="flex items-center gap-2.5 font-medium">
                <t.icon className="size-4 text-primary" aria-hidden />
                {t.title}
              </dt>
              <dd className="leading-relaxed text-muted-foreground">{t.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="steps" className="border-y bg-card/60">
        <div className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6">
          <h2 id="steps" className="mb-8 text-xl font-semibold">
            Getting started
          </h2>
          <Steps steps={HOW_STEPS_OWNER} />
        </div>
      </section>

      <section aria-labelledby="owner-faq" className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
        <h2 id="owner-faq" className="mb-6 text-xl font-semibold">
          Owner questions
        </h2>
        <FaqList items={FAQ_OWNERS} />
      </section>
    </main>
  )
}
