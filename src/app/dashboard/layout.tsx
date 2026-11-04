import { AppShell } from "@/components/layout/app-shell"

export default function TenantLayout({ children }: LayoutProps<"/dashboard">) {
  return <AppShell role="TENANT">{children}</AppShell>
}
