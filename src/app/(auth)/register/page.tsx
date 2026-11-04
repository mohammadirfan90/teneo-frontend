import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { RegisterForm } from "@/features/auth/register-form"

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a Teneo account to rent a room or list your property.",
}

function FormFallback() {
  return (
    <div className="flex flex-col gap-5" aria-hidden>
      <Skeleton className="h-24" />
      <Skeleton className="h-16" />
      <Skeleton className="h-20" />
      <Skeleton className="h-16" />
      <Skeleton className="h-11" />
    </div>
  )
}

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[1.75rem] font-semibold">Create your account</h1>
        <p className="mt-1.5 text-muted-foreground">
          After signing up you&apos;ll verify your identity before applying or publishing listings.
        </p>
      </div>

      <Suspense fallback={<FormFallback />}>
        <RegisterForm />
      </Suspense>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
