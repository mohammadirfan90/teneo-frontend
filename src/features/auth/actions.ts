"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { backendRaw } from "@/lib/api/backend"
import { isApiError } from "@/lib/api/errors"
import { ACCESS_COOKIE, clearSession, primaryRole, writeSession } from "@/lib/auth/cookies"
import { homeFor, requiredRoleFor, safeNext } from "@/lib/auth/roles"
import { DEMO_ACCOUNTS, signIn, signUp } from "@/lib/auth/sign-in"
import type { AuthResponse } from "@/types/api"
import { DEMO_ROLES, loginSchema, registerSchema, type DemoRole } from "./schemas"

export interface AuthFormState {
  ok: false
  message: string
  fieldErrors?: Partial<Record<string, string>>
}

/** Send the user to `next` only if their role may open it; otherwise their home. */
function destination(auth: AuthResponse, next: string | undefined): string {
  const role = primaryRole(auth.user.roles)
  const home = homeFor(role)
  const target = safeNext(next, home)
  const needed = requiredRoleFor(target.split("?")[0])
  if (target === "/login" || target === "/register") return home
  return needed && needed !== role ? home : target
}

function toState(e: unknown, fallback: string): AuthFormState {
  if (!isApiError(e)) return { ok: false, message: fallback }
  if (e.status === 429) {
    return { ok: false, message: "Too many attempts for this email. Wait 15 minutes, then try again." }
  }
  if (e.status === 401) return { ok: false, message: "That email and password don't match an account." }
  if (e.status === 409) {
    return {
      ok: false,
      message: e.message,
      fieldErrors: { email: "An account with this email already exists." },
    }
  }
  const fieldErrors = e.fieldErrors()
  return {
    ok: false,
    message: Object.keys(fieldErrors).length ? "Please fix the highlighted fields." : e.userMessage,
    fieldErrors,
  }
}

export async function loginAction(input: unknown, next?: string): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields." }

  let auth: AuthResponse
  try {
    auth = await signIn(parsed.data.email, parsed.data.password)
  } catch (e) {
    return toState(e, "Couldn't sign you in. Please try again.")
  }
  writeSession(await cookies(), auth)
  revalidatePath("/", "layout")
  redirect(destination(auth, next))
}

export async function registerAction(input: unknown): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields." }

  let auth: AuthResponse
  try {
    const { email, password, role } = parsed.data
    auth = await signUp({ email, password, role })
  } catch (e) {
    return toState(e, "Couldn't create your account. Please try again.")
  }
  writeSession(await cookies(), auth)
  revalidatePath("/", "layout")
  redirect(destination(auth, undefined))
}

export async function demoLoginAction(role: DemoRole): Promise<AuthFormState> {
  if (!DEMO_ROLES.includes(role)) return { ok: false, message: "Unknown demo account." }
  const account = DEMO_ACCOUNTS[role]
  let auth: AuthResponse
  try {
    auth = await signIn(account.email, account.password)
  } catch (e) {
    return toState(e, "The demo account is unavailable right now.")
  }
  writeSession(await cookies(), auth)
  revalidatePath("/", "layout")
  redirect(homeFor(primaryRole(auth.user.roles)))
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies()
  const accessToken = jar.get(ACCESS_COOKIE)?.value
  if (accessToken) {
    // Revokes refresh tokens server-side; ignore failures — we clear locally regardless.
    await backendRaw("/auth/logout", { method: "POST", accessToken }).catch(() => null)
  }
  clearSession(jar)
  revalidatePath("/", "layout")
  redirect("/login")
}
