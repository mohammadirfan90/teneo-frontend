import { BadgeCheck, FileSignature, ReceiptText, Search } from "lucide-react"

import { Logo } from "@/components/shared/logo"

const STEPS = [
  {
    icon: Search,
    title: "Search verified rooms",
    body: "Every published listing comes from an owner who passed identity checks.",
  },
  {
    icon: BadgeCheck,
    title: "Apply and book a viewing",
    body: "Owners screen applications and propose viewing slots in the app.",
  },
  {
    icon: FileSignature,
    title: "Sign the lease online",
    body: "Both sides sign the same digital lease. Move-in is confirmed in one tap.",
  },
  {
    icon: ReceiptText,
    title: "Pay rent and bills",
    body: "Invoices arrive monthly and are paid by card through Stripe.",
  },
]

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-svh flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <Logo />
        <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          {children}
        </main>
      </div>
      <aside className="hidden border-l bg-sidebar lg:flex lg:flex-col lg:justify-center lg:px-14">
        <div className="max-w-md">
          <h2 className="text-xl font-semibold">From search to move-in, in one place</h2>
          <ol className="mt-8 flex flex-col gap-6">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg border bg-card text-primary">
                  <step.icon className="size-4" aria-hidden />
                </span>
                <div>
                  <p className="font-medium">
                    <span className="mr-1.5 font-mono text-xs text-subtle tabular-nums">0{i + 1}</span>
                    {step.title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  )
}
