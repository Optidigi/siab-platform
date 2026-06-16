import { NextResponse } from "next/server"
import { auth } from "@/lib/betterAuth"
import { issuePayloadSessionCookie } from "@/lib/socialAuth/payloadSession"
import { validateNextRedirect } from "@/lib/auth/validateNextRedirect"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const session = await auth.api.getSession({
    headers: req.headers,
    query: { disableCookieCache: true },
  })

  const payloadUserId = (session?.user as { payloadUserId?: string | null } | undefined)?.payloadUserId
  if (!payloadUserId) {
    return NextResponse.redirect(new URL("/login?error=social-unlinked", url))
  }

  try {
    const payloadCookie = await issuePayloadSessionCookie(payloadUserId, req)
    const destination = validateNextRedirect(url.searchParams.get("next"))
    const response = NextResponse.redirect(new URL(destination, url))
    response.headers.append("Set-Cookie", payloadCookie)
    return response
  } catch {
    return NextResponse.redirect(new URL("/login?error=social-session", url))
  }
}

