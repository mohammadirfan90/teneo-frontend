"use client"

import { Check } from "lucide-react"
import { cn } from "cn"

import { Progress } from "@/components/ui/progress"
import { WIZARD_STEPS, type WizardStep } from "../wizard-store"

/** Numbered steps; completed steps are links back (to view or edit what was saved). */
export function WizardStepper({
  step,
  furthest,
  onSelect,
}: {
  step: WizardStep
  furthest: WizardStep
  onSelect: (s: WizardStep) => void
}) {
  const current = WIZARD_STEPS[step]
  return (
    <nav aria-label="Listing steps">
      <div className="flex flex-col gap-2 md:hidden">
        <p className="text-sm">
          <span className="text-muted-foreground tabular-nums">
            Step {step + 1} of {WIZARD_STEPS.length}
          </span>{" "}
          · <span className="font-medium">{current.label}</span>
        </p>
        <Progress value={((step + 1) / WIZARD_STEPS.length) * 100} aria-hidden />
      </div>

      <ol className="hidden gap-2 md:grid md:grid-cols-6">
        {WIZARD_STEPS.map((s, i) => {
          const done = i < step || (i <= furthest && i !== step)
          const active = i === step
          const reachable = i <= furthest
          return (
            <li key={s.key}>
              <button
                type="button"
                disabled={!reachable || active}
                onClick={() => onSelect(i as WizardStep)}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "group flex w-full flex-col gap-2 rounded-lg border-t-2 pt-3 text-left transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none disabled:cursor-default",
                  active ? "border-primary" : done ? "border-primary/40" : "border-border",
                  reachable && !active && "hover:border-primary"
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span
                    className={cn(
                      "grid size-5 place-items-center rounded-full text-[0.6875rem] tabular-nums",
                      active
                        ? "bg-primary text-primary-foreground"
                        : done
                          ? "bg-primary/10 text-primary"
                          : "bg-surface-2 text-muted-foreground"
                    )}
                  >
                    {done ? <Check className="size-3" aria-hidden /> : i + 1}
                  </span>
                  <span className={cn(!active && !reachable && "text-muted-foreground")}>{s.label}</span>
                </span>
                <span className="text-xs text-muted-foreground">{s.hint}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
