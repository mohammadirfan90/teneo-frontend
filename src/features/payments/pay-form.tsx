"use client"

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { loadStripe, type Appearance, type Stripe } from "@stripe/stripe-js"
import { useQuery } from "@tanstack/react-query"
import { AlertCircle, Lock } from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { useState, type FormEvent } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import { formatMoney } from "@/lib/format"
import type { PaymentView } from "@/features/tenant/types"

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
let stripePromise: Promise<Stripe | null> | null = null
function getStripe() {
  if (!stripePromise && publishableKey) stripePromise = loadStripe(publishableKey)
  return stripePromise
}

interface IntentResponse {
  payment: PaymentView
  clientSecret: string
}

/**
 * One PaymentIntent per attempt. The backend wants the same uuid in the Idempotency-Key header
 * and the body; an empty clientSecret means that key was already used, so we retry with a new one.
 */
async function createIntent(invoiceId: string): Promise<IntentResponse> {
  for (let tries = 0; tries < 2; tries++) {
    const key = crypto.randomUUID()
    const res = await apiClient.post<IntentResponse>(
      "/payments/stripe/intent",
      { invoiceId, idempotencyKey: key },
      { idempotencyKey: key }
    )
    if (res.clientSecret) return res
  }
  throw new Error("Stripe didn't return a payment session.")
}

function intentError(e: unknown): { title: string; body: string; retry: boolean } {
  if (isApiError(e)) {
    if (e.status === 409)
      return { title: "Nothing to pay", body: "This invoice is already paid or was waived.", retry: false }
    if (e.status === 503)
      return {
        title: "Card payments are unavailable",
        body: "Online payments are switched off on the server right now. Try again later.",
        retry: false,
      }
    if (e.status === 403)
      return {
        title: "You can't pay this invoice",
        body: "Only a tenant on this lease can pay it.",
        retry: false,
      }
    if (e.status === 404)
      return { title: "Invoice not found", body: "It may have been removed.", retry: false }
    return { title: "Couldn't start the payment", body: e.userMessage, retry: true }
  }
  return { title: "Couldn't start the payment", body: "Check your connection and try again.", retry: true }
}

export function PayForm({
  invoiceId,
  totalMinor,
  currency,
}: {
  invoiceId: string
  totalMinor: string
  currency: string
}) {
  const [attempt, setAttempt] = useState(0)
  const { resolvedTheme } = useTheme()
  const intent = useQuery({
    queryKey: ["stripe-intent", invoiceId, attempt],
    queryFn: () => createIntent(invoiceId),
    enabled: Boolean(publishableKey),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  })

  if (!publishableKey) {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>Card payments aren&apos;t set up</AlertTitle>
        <AlertDescription>
          This site has no Stripe key configured, so cards can&apos;t be taken here.
        </AlertDescription>
      </Alert>
    )
  }

  if (intent.isPending) return <PayFormSkeleton />

  if (intent.isError) {
    const err = intentError(intent.error)
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>{err.title}</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-3">
          {err.body}
          <div className="flex flex-wrap gap-2">
            {err.retry && (
              <Button size="sm" variant="outline" onClick={() => setAttempt((a) => a + 1)}>
                Try again
              </Button>
            )}
            <Button size="sm" variant="ghost" asChild>
              <Link href="/dashboard/payments">Back to Rent & bills</Link>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  const dark = resolvedTheme === "dark"
  const appearance: Appearance = {
    theme: dark ? "night" : "stripe",
    variables: {
      colorPrimary: dark ? "#5fb394" : "#1f5c4a",
      colorBackground: dark ? "#1a1a18" : "#ffffff",
      colorText: dark ? "#f2f1ec" : "#1c1b18",
      colorDanger: dark ? "#e5675b" : "#b3362c",
      fontFamily: '"Instrument Sans", system-ui, sans-serif',
      borderRadius: "8px",
      spacingUnit: "4px",
    },
  }

  return (
    <Elements
      stripe={getStripe()}
      options={{
        clientSecret: intent.data.clientSecret,
        appearance,
        fonts: [{ cssSrc: "https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600" }],
      }}
    >
      <CheckoutForm invoiceId={invoiceId} totalMinor={totalMinor} currency={currency} />
    </Elements>
  )
}

function CheckoutForm({
  invoiceId,
  totalMinor,
  currency,
}: {
  invoiceId: string
  totalMinor: string
  currency: string
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [ready, setReady] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setSubmitting(true)
    setMessage(null)
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment/success?invoice=${encodeURIComponent(invoiceId)}`,
      },
    })
    // Only reached when confirmation fails; success redirects to return_url.
    setSubmitting(false)
    setMessage(
      error.type === "card_error" || error.type === "validation_error"
        ? (error.message ?? "Your card was declined.")
        : "The payment couldn't be completed. You haven't been charged; try again."
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" aria-busy={submitting || undefined}>
      {!ready && <PaymentElementSkeleton />}
      <div className={ready ? undefined : "sr-only"}>
        <PaymentElement onReady={() => setReady(true)} options={{ layout: "tabs" }} />
      </div>

      {message && (
        <Alert variant="destructive" role="alert">
          <AlertCircle />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" asChild>
          <Link href={`/payment/cancel?invoice=${encodeURIComponent(invoiceId)}`}>Cancel</Link>
        </Button>
        <Button type="submit" size="lg" disabled={!stripe || !ready} loading={submitting}>
          <Lock /> Pay {formatMoney(totalMinor, currency)}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Card details go straight to Stripe and never touch Teneo&apos;s servers.
        {publishableKey?.startsWith("pk_test_") &&
          " Test mode: use card 4242 4242 4242 4242 with any future date and any CVC."}
      </p>
    </form>
  )
}

function PaymentElementSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-11 w-full" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-11" />
        <Skeleton className="h-11" />
      </div>
      <Skeleton className="h-11 w-full" />
    </div>
  )
}

export function PayFormSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy aria-label="Preparing secure payment">
      <PaymentElementSkeleton />
      <div className="flex justify-end">
        <Skeleton className="h-11 w-40" />
      </div>
    </div>
  )
}
