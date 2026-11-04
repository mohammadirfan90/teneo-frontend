import { NextResponse, type NextRequest } from "next/server"

import { DEMO_ROLES, type DemoRole } from "@/features/auth/schemas"
import { primaryRole, writeSession } from "@/lib/auth/cookies"
import { homeFor } from "@/lib/auth/roles"
import { DEMO_ACCOUNTS, signIn } from "@/lib/auth/sign-in"
import { isApiError } from "@/lib/api/errors"

/** Programmatic demo sign-in (smoke tests, screenshots). The UI uses demoLoginAction. */
export async function POST(_request: NextRequest, ctx: RouteContext<"/api/auth/demo/[role]">) {
  const { role } = await ctx.params
  if (!DEMO_ROLES.includes(role as DemoRole)) {
    return NextResponse.json({ success: false, message: "Unknown demo role" }, { status: 404 })
  }
  try {
    const auth = await signIn(DEMO_ACCOUNTS[role as DemoRole].email, DEMO_ACCOUNTS[role as DemoRole].password)
    const res = NextResponse.json({
      success: true,
      message: "Signed in",
      data: { user: auth.user, redirectTo: homeFor(primaryRole(auth.user.roles)) },
    })
    writeSession(res.cookies, auth)
    return res
  } catch (e) {
    const status = isApiError(e) ? e.status : 503
    return NextResponse.json({ success: false, message: "Demo sign-in failed" }, { status })
  }
}
