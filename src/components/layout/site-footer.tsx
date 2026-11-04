import Link from "next/link"

import { ThemeToggle } from "./theme-toggle"

const COLUMNS = [
  {
    title: "Renters",
    links: [
      { href: "/rooms", label: "Find a room" },
      { href: "/how-it-works", label: "How renting works" },
      { href: "/register", label: "Create an account" },
    ],
  },
  {
    title: "Owners",
    links: [
      { href: "/owners", label: "List a property" },
      { href: "/faq#owners", label: "Owner questions" },
    ],
  },
  {
    title: "Teneo",
    links: [
      { href: "/about", label: "About" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-card/50">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="col-span-2 max-w-xs md:col-span-1">
          <p className="text-[1.0625rem] font-semibold tracking-tight">Teneo</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Verified rooms, roommate matching, digital leases and online rent — from search to move-in.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h2 className="text-sm font-semibold">{col.title}</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 text-sm text-muted-foreground sm:px-6">
          <p>Teneo · Housing & roommate platform</p>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  )
}
