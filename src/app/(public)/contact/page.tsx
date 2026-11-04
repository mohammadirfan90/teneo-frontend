import { Clock, Mail, ShieldCheck } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { ContactForm } from "@/features/marketing/contact-form"
import { PageIntro } from "@/features/marketing/page-intro"

export const metadata: Metadata = {
  title: "Contact",
  description: "Questions about renting, listing, payments or verification on Teneo? Get in touch.",
  openGraph: { title: "Contact Teneo", description: "Get help with renting or listing on Teneo." },
}

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "support@teneo.app"

export default function ContactPage() {
  return (
    <main>
      <PageIntro
        title="Contact us"
        lead="Questions about a listing, a payment or your verification? Send us a message and include anything that helps us find your account or tenancy."
      />
      <div className="mx-auto grid w-full max-w-4xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[minmax(0,1fr)_260px]">
        <ContactForm to={CONTACT_EMAIL} />
        <aside className="flex flex-col gap-6 text-sm">
          <div className="flex gap-3">
            <Mail className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="font-medium">Email</p>
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-muted-foreground hover:text-foreground">
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="font-medium">Verification questions</p>
              <p className="text-muted-foreground">
                Check the status and reviewer notes on your profile page first — most answers are there.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="font-medium">Repairs</p>
              <p className="text-muted-foreground">
                For problems in your room, raise a maintenance ticket from your dashboard so your owner sees
                it straight away.
              </p>
            </div>
          </div>
          <p className="text-muted-foreground">
            Looking for quick answers?{" "}
            <Link href="/faq" className="font-medium text-primary hover:underline">
              Read the FAQ
            </Link>
          </p>
        </aside>
      </div>
    </main>
  )
}
