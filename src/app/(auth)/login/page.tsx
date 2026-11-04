import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { DemoLogin } from "@/features/auth/demo-login"
import { LoginForm } from "@/features/auth/login-form"

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Teneo to manage applications, leases, rent and maintenance.",
}

function FormFallback() {
  return (
    <div className="flex flex-col gap-5" aria-hidden>
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
      <Skeleton className="h-11" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[1.75rem] font-semibold">Welcome back</h1>
        <p className="mt-1.5 text-muted-foreground">Sign in to your Teneo account.</p>
      </div>

      <Suspense fallback={<FormFallback />}>
        <LoginForm />
      </Suspense>

      <div className="flex items-center gap-3 text-xs text-subtle" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <DemoLogin />

      <p className="text-center text-sm text-muted-foreground">
        New to Teneo?{" "}
        <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  )
}
