import { auth } from "@/lib/betterAuth"
import { isAllowedSocialAuthHost } from "@/lib/socialAuth/hosts"
import { toNextJsHandler } from "better-auth/next-js"

const handlers = toNextJsHandler(auth)

const ensureAllowedHost = async (request: Request): Promise<Response | null> => {
  if (await isAllowedSocialAuthHost(request)) return null
  return new Response("Unknown auth host", { status: 404 })
}

export async function GET(request: Request) {
  return (await ensureAllowedHost(request)) ?? handlers.GET(request)
}

export async function POST(request: Request) {
  return (await ensureAllowedHost(request)) ?? handlers.POST(request)
}
