import { auth } from "@/lib/betterAuth"
import { buildCmsAuthRequest, isAllowedSocialAuthHost } from "@/lib/socialAuth/hosts"
import { toNextJsHandler } from "better-auth/next-js"

const handlers = toNextJsHandler(auth)

const ensureAllowedHost = async (request: Request): Promise<Response | null> => {
  if (await isAllowedSocialAuthHost(request)) return null
  return new Response("Unknown auth host", { status: 404 })
}

export async function GET(request: Request) {
  const denied = await ensureAllowedHost(request)
  if (denied) return denied
  const authRequest = buildCmsAuthRequest(request)
  return handlers.GET(authRequest)
}

export async function POST(request: Request) {
  const denied = await ensureAllowedHost(request)
  if (denied) return denied
  const authRequest = buildCmsAuthRequest(request)
  return handlers.POST(authRequest)
}
