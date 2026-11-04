"use client"

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"
import { useRouter } from "next/navigation"
import { useEffect, useState, type ReactNode } from "react"
import { toast } from "sonner"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { isApiError } from "@/lib/api/errors"

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      /** Skip the global error toast (the caller shows inline errors instead). */
      silent?: boolean
    }
    queryMeta: {
      /** Show a toast when this background query fails. */
      toastOnError?: boolean
    }
  }
}

/** Set from an effect so cache callbacks (created once) can use the live router. */
const navigation: { replace: (href: string) => void } = { replace: () => {} }

function onUnauthorized(error: unknown): boolean {
  if (!isApiError(error) || error.status !== 401) return false
  const next = window.location.pathname + window.location.search
  navigation.replace(`/login?next=${encodeURIComponent(next)}`)
  return true
}

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter()
  useEffect(() => {
    navigation.replace = (href) => router.replace(href)
  }, [router])

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (count, error) => !(isApiError(error) && error.status < 500) && count < 2,
          },
        },
        queryCache: new QueryCache({
          onError: (error, query) => {
            if (onUnauthorized(error)) return
            if (query.meta?.toastOnError)
              toast.error(isApiError(error) ? error.userMessage : "Couldn't load data.")
          },
        }),
        mutationCache: new MutationCache({
          onError: (error, _vars, _ctx, mutation) => {
            if (onUnauthorized(error)) return
            if (mutation.meta?.silent) return
            toast.error(isApiError(error) ? error.userMessage : "Something went wrong. Please try again.")
          },
        }),
      })
  )

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>
          {children}
          <Toaster position="top-center" closeButton />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
