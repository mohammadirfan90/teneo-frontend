import { ChevronDown } from "lucide-react"

import type { Faq } from "./content"

/** Native <details> accordion — keyboard accessible, works without JS. */
export function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="divide-y rounded-xl border bg-card">
      {items.map((item) => (
        <details key={item.q} className="group px-4 sm:px-5 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium">
            {item.q}
            <ChevronDown
              className="size-4 shrink-0 text-subtle transition-transform duration-150 group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <p className="max-w-prose pb-4 leading-relaxed text-muted-foreground">{item.a}</p>
        </details>
      ))}
    </div>
  )
}
