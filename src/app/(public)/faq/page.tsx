import type { Metadata } from "next"
import Link from "next/link"

import { FAQ_OWNERS, FAQ_RENTERS } from "@/features/marketing/content"
import { FaqList } from "@/features/marketing/faq-list"
import { PageIntro } from "@/features/marketing/page-intro"

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description:
    "Answers about identity checks, applications, digital leases, card payments, utility splits, maintenance and roommate matching on Teneo.",
  openGraph: { title: "Teneo FAQ", description: "How renting and letting work on Teneo." },
}

export default function FaqPage() {
  return (
    <main>
      <PageIntro
        title="Frequently asked questions"
        lead="How verification, applications, leases, payments and repairs work — for renters and for owners."
      />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-14 px-4 py-14 sm:px-6">
        <section aria-labelledby="renters">
          <h2 id="renters" className="mb-5 text-xl font-semibold">
            Renters
          </h2>
          <FaqList items={FAQ_RENTERS} />
        </section>
        <section aria-labelledby="owners" id="owners" className="scroll-mt-24">
          <h2 id="owners-h" className="mb-5 text-xl font-semibold">
            Owners
          </h2>
          <FaqList items={FAQ_OWNERS} />
        </section>
        <p className="text-muted-foreground">
          Still stuck?{" "}
          <Link href="/contact" className="font-medium text-primary underline-offset-4 hover:underline">
            Contact us
          </Link>{" "}
          and we&apos;ll get back to you.
        </p>
      </div>
    </main>
  )
}
