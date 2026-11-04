import { AppShell } from "@/components/layout/app-shell"

export default function OwnerLayout({ children }: LayoutProps<"/owner">) {
  return <AppShell role="OWNER">{children}</AppShell>
}
