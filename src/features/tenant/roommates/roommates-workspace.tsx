"use client"

import { useMutation } from "@tanstack/react-query"
import { Handshake, Pencil, Sparkles, UsersRound } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import { formatDate, formatDateTime, formatMoney, humanize } from "@/lib/format"
import type { IntroRequestView, MatchResultPage, MatchResultView, PreferencesView } from "../types"
import { PreferencesWizard } from "./preferences-wizard"
import { LIFESTYLE_LABEL, VISIBILITY_LABEL, draftFromPreferences } from "./schema"

const BREAKDOWN: Array<{ key: keyof MatchResultView["breakdown"]; label: string; max: number }> = [
  { key: "lifestyle", label: "Lifestyle", max: 40 },
  { key: "budget", label: "Budget", max: 25 },
  { key: "city", label: "City", max: 15 },
  { key: "moveIn", label: "Move-in dates", max: 10 },
  { key: "interests", label: "Interests", max: 10 },
]

export function RoommatesWorkspace({
  initialPreferences,
  initialResults,
  citySuggestions,
}: {
  initialPreferences: PreferencesView | null
  initialResults: MatchResultPage
  citySuggestions: string[]
}) {
  const [prefs, setPrefs] = useState(initialPreferences)
  const [editing, setEditing] = useState(initialPreferences === null)
  const [results, setResults] = useState(initialResults)
  const [intros, setIntros] = useState<Record<string, IntroRequestView>>({})

  const run = useMutation({
    meta: { silent: true },
    mutationFn: () => apiClient.post<MatchResultPage>("/match/run", { limit: 20 }),
    onSuccess: (page) => {
      setResults(page)
      toast.success(page.items.length ? `Found ${page.items.length} possible roommates` : "No matches yet")
    },
    onError: (e) => {
      if (isApiError(e) && e.status === 404) {
        setEditing(true)
        return toast.error("Save your preferences first.")
      }
      toast.error(isApiError(e) ? e.userMessage : "Couldn't run matching. Try again.")
    },
  })

  const intro = useMutation({
    meta: { silent: true },
    mutationFn: (m: MatchResultView) =>
      apiClient.post<IntroRequestView>(`/match/results/${m.matchId}/intro`, {}),
    onSuccess: (req, m) => {
      setIntros((cur) => ({ ...cur, [m.matchId]: req }))
      toast.success(
        req.status === "MUTUAL" ? `You and ${req.counterpartDisplayName} both said yes` : "Intro requested"
      )
    },
    onError: (e) =>
      toast.error(
        isApiError(e) && e.status >= 500
          ? "Intro requests aren't working on the server right now. Nothing was sent; try again later."
          : isApiError(e)
            ? e.userMessage
            : "Couldn't send the request. Try again."
      ),
  })

  return (
    <div className="flex flex-col gap-6">
      {editing || !prefs ? (
        <PreferencesWizard
          saved={prefs}
          citySuggestions={citySuggestions}
          onSaved={(p) => {
            setPrefs(p)
            setEditing(false)
          }}
          onCancel={prefs ? () => setEditing(false) : undefined}
        />
      ) : (
        <PreferencesSummary prefs={prefs} onEdit={() => setEditing(true)} />
      )}

      {prefs && !editing && (
        <section aria-labelledby="matches-heading" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="matches-heading" className="text-lg font-semibold">
                Matches
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {results.summary.ranAt
                  ? `Last run ${formatDateTime(results.summary.ranAt)} · ${results.summary.candidateCount} tenants compared`
                  : "Compare your preferences with other tenants looking for roommates."}
              </p>
            </div>
            <Button onClick={() => run.mutate()} loading={run.isPending}>
              <Sparkles /> {results.summary.ranAt ? "Find matches again" : "Find matches"}
            </Button>
          </div>

          {results.items.length === 0 ? (
            <EmptyState
              icon={UsersRound}
              title={results.summary.ranAt ? "No matches this time" : "No matches yet"}
              description={
                results.summary.ranAt
                  ? "Nobody else's preferences overlap with yours right now. Widen your budget or cities and try again."
                  : "Run matching to see who fits your budget, cities, dates and lifestyle."
              }
            />
          ) : (
            <ol className="flex flex-col gap-4">
              {results.items.map((m) => (
                <MatchCard
                  key={m.matchId}
                  match={m}
                  request={intros[m.matchId]}
                  pending={intro.isPending && intro.variables?.matchId === m.matchId}
                  onIntro={() => intro.mutate(m)}
                  myInterests={prefs.interests}
                />
              ))}
            </ol>
          )}
          <p className="text-sm text-muted-foreground">
            Intro requests you receive from others can&apos;t be listed yet; Teneo only shows the ones you
            send.
          </p>
        </section>
      )}
    </div>
  )
}

function PreferencesSummary({ prefs, onEdit }: { prefs: PreferencesView; onEdit: () => void }) {
  const d = draftFromPreferences(prefs)
  const budget =
    prefs.budgetMinMinor && prefs.budgetMaxMinor
      ? `${formatMoney(prefs.budgetMinMinor)} – ${formatMoney(prefs.budgetMaxMinor)}`
      : prefs.budgetMaxMinor
        ? `Up to ${formatMoney(prefs.budgetMaxMinor)}`
        : prefs.budgetMinMinor
          ? `From ${formatMoney(prefs.budgetMinMinor)}`
          : "Not set"
  const moveIn =
    prefs.moveInFrom || prefs.moveInTo
      ? [prefs.moveInFrom && formatDate(prefs.moveInFrom), prefs.moveInTo && formatDate(prefs.moveInTo)]
          .filter(Boolean)
          .join(" – ")
      : "Flexible"
  const lifestyle = [
    d.smoking && LIFESTYLE_LABEL.smoking[d.smoking],
    d.pets && LIFESTYLE_LABEL.pets[d.pets],
    d.sleep && LIFESTYLE_LABEL.sleep[d.sleep],
  ].filter(Boolean)

  return (
    <section aria-labelledby="prefs-heading" className="rounded-xl border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="prefs-heading" className="text-lg font-semibold">
            Your preferences
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {VISIBILITY_LABEL[prefs.visibility].title} · updated {formatDate(prefs.updatedAt)}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil /> Edit
        </Button>
      </div>
      <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-sm text-muted-foreground">Budget a month</dt>
          <dd className="font-medium tabular-nums">{budget}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Cities</dt>
          <dd className="font-medium">{prefs.preferredCities.join(", ") || "Any"}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Move-in</dt>
          <dd className="font-medium">{moveIn}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Lifestyle</dt>
          <dd className="font-medium">{lifestyle.length ? lifestyle.join(", ") : "Not set"}</dd>
        </div>
      </dl>
      {prefs.interests.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Interests">
          {prefs.interests.map((i) => (
            <li key={i} className="rounded-md bg-surface-2 px-2 py-0.5 text-sm">
              {i}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function MatchCard({
  match,
  request,
  pending,
  onIntro,
  myInterests,
}: {
  match: MatchResultView
  request?: IntroRequestView
  pending: boolean
  onIntro: () => void
  myInterests: string[]
}) {
  const c = match.candidate
  const mine = new Set(myInterests.map((i) => i.toLowerCase()))
  const titleId = `match-${match.matchId}`
  // hardPenalties is only filled by /match/run; the stored explain text carries them too.
  const penalties = [
    ...new Set(
      [
        ...match.hardPenalties.map((p) => p.replace(/^.*Hard penalty:\s*/i, "").trim()),
        ...match.explain.split("\n").map((l) => l.match(/Hard penalty:\s*(.+)$/i)?.[1]?.trim()),
      ]
        .filter((p): p is string => Boolean(p))
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    ),
  ]
  return (
    <li aria-labelledby={titleId} className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-semibold tabular-nums">
            #{match.rank}
          </span>
          <div>
            <h3 id={titleId} className="font-semibold">
              {c.displayName}
            </h3>
            <p className="text-sm text-muted-foreground">
              {[
                c.gender && c.gender !== "UNDISCLOSED" ? humanize(c.gender) : null,
                c.preferredCities.join(", "),
              ]
                .filter(Boolean)
                .join(" · ") || "No details shared"}
            </p>
          </div>
        </div>
        <p className="text-right">
          <span className="text-3xl font-semibold tracking-tight tabular-nums">
            {Math.round(match.score)}
          </span>
          <span className="text-sm text-muted-foreground">/100</span>
          <span className="block text-xs text-muted-foreground">match score</span>
        </p>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <dl className="flex flex-col gap-2.5" aria-label="Score breakdown">
          {BREAKDOWN.map((b) => {
            const v = Math.max(0, Math.min(b.max, match.breakdown[b.key]))
            return (
              <div
                key={b.key}
                className="grid grid-cols-[7.5rem_minmax(0,1fr)_3rem] items-center gap-3 text-sm"
              >
                <dt className="text-muted-foreground">{b.label}</dt>
                <dd className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${(v / b.max) * 100}%` }}
                  />
                </dd>
                <dd className="text-right tabular-nums">
                  {Math.round(v)}/{b.max}
                </dd>
              </div>
            )
          })}
        </dl>
        <div className="flex flex-col gap-3">
          {penalties.length > 0 ? (
            <div className="rounded-lg bg-warning-soft p-3 text-sm">
              <p className="font-medium">Score lowered from {Math.round(match.breakdown.base)} because of:</p>
              <ul className="mt-1 list-disc pl-5">
                {penalties.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No deal-breakers between your preferences.</p>
          )}
          {c.interests.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Their interests">
              {c.interests.map((i) => (
                <li
                  key={i}
                  className={`rounded-md px-2 py-0.5 text-xs ${mine.has(i.toLowerCase()) ? "bg-primary/10 text-primary" : "bg-surface-2"}`}
                >
                  {i}
                </li>
              ))}
            </ul>
          )}
          {match.explain && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                How this score was worked out
              </summary>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-surface-2 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                {match.explain}
              </pre>
            </details>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        {request ? (
          <p className="flex items-center gap-2 text-sm">
            <StatusBadge status={request.status} />
            {request.status === "MUTUAL"
              ? "You both agreed to be introduced."
              : request.status === "DECLINED"
                ? `${request.counterpartDisplayName} declined.`
                : `Waiting for ${request.counterpartDisplayName} to accept.`}
          </p>
        ) : c.contactRevealed ? (
          <p className="text-sm text-muted-foreground">You&apos;ve already been introduced.</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            They&apos;ll see your request and can accept or decline.
          </p>
        )}
        {!request && !c.contactRevealed && (
          <Button variant="outline" size="sm" onClick={onIntro} loading={pending}>
            <Handshake /> Request intro
          </Button>
        )}
      </div>
    </li>
  )
}
