import "server-only"

import { backendRaw } from "@/lib/api/backend"
import { ApiError, isFailureBody } from "@/lib/api/errors"
import type { DemoRole } from "@/features/auth/schemas"
import type { AuthResponse, Role } from "@/types/api"

/** Seeded demo accounts (B7A6 prisma/seed.ts). Overridable per environment. */
export const DEMO_ACCOUNTS: Record<DemoRole, { email: string; password: string; role: Role }> = {
  tenant: {
    email: process.env.DEMO_TENANT_EMAIL ?? "tenant1@demo.local",
    password: process.env.DEMO_PASSWORD ?? "Demo123!@#",
    role: "TENANT",
  },
  owner: {
    email: process.env.DEMO_OWNER_EMAIL ?? "owner1@demo.local",
    password: process.env.DEMO_PASSWORD ?? "Demo123!@#",
    role: "OWNER",
  },
  admin: {
    email: process.env.DEMO_ADMIN_EMAIL ?? "demo@admin.local",
    password: process.env.DEMO_PASSWORD ?? "Demo123!@#",
    role: "ADMIN",
  },
}

async function call(path: string, body: unknown): Promise<AuthResponse> {
  const { status, body: res } = await backendRaw<AuthResponse>(path, { method: "POST", body })
  if (res?.success) return res.data
  if (isFailureBody(res)) throw ApiError.fromFailure(status, res)
  throw new ApiError(status || 503, "The sign-in service is unavailable. Try again shortly.")
}

export function signIn(email: string, password: string) {
  return call("/auth/login", { email, password })
}

export function signUp(input: { email: string; password: string; role: "TENANT" | "OWNER" }) {
  return call("/auth/signup", input)
}
