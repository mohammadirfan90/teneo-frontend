import type { ReactNode } from "react"

export function PageIntro({ title, lead, children }: { title: string; lead: string; children?: ReactNode }) {
  return (
    <header className="border-b">
      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-[2rem] leading-tight font-bold sm:text-[2.5rem]">{title}</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">{lead}</p>
        {children && <div className="mt-6">{children}</div>}
      </div>
    </header>
  )
}

export function Steps({ steps }: { steps: Array<{ title: string; body: string }> }) {
  return (
    <ol className="flex flex-col">
      {steps.map((s, i) => (
        <li key={s.title} className="relative flex gap-5 pb-8 last:pb-0">
          <div className="flex flex-col items-center">
            <span className="grid size-8 shrink-0 place-items-center rounded-full border bg-card font-mono text-sm text-primary tabular-nums">
              {i + 1}
            </span>
            {i < steps.length - 1 && <span className="mt-2 w-px flex-1 bg-border" aria-hidden />}
          </div>
          <div className="pt-1">
            <h3 className="font-semibold">{s.title}</h3>
            <p className="mt-1 max-w-prose leading-relaxed text-muted-foreground">{s.body}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
