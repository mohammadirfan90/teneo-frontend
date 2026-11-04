import { AppShell } from "@/components/layout/app-shell"

/** Stripe return pages live outside /dashboard (stable return_url) but keep the tenant chrome. */
export default function PaymentLayout({ children }: LayoutProps<"/payment">) {
  return <AppShell role="TENANT">{children}</AppShell>
}
