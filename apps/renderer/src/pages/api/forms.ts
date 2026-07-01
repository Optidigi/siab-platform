import type { APIRoute } from "astro"
import { buildCmsFormPayload, cmsFormsEndpoint } from "../../lib/forms"

function jsonResponse(body: Record<string, unknown>, status: number, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
  })
}

function methodNotAllowed(): Response {
  return jsonResponse(
    {
      ok: false,
      error: "method_not_allowed",
      message: "Please submit the form with POST.",
    },
    405,
    { allow: "POST" },
  )
}

export const POST: APIRoute = async ({ request }) => {
  const endpoint = cmsFormsEndpoint()
  if (!endpoint) {
    return jsonResponse(
      {
        ok: false,
        error: "forms_unavailable",
        message: "Form submissions are temporarily unavailable.",
      },
      503,
    )
  }

  const result = await buildCmsFormPayload(request)
  if (!result.ok) {
    return jsonResponse(
      {
        ok: false,
        error: result.code,
        message: result.message,
      },
      result.status,
    )
  }

  const headers: HeadersInit = {
    "content-type": "application/json",
  }
  if (result.forwardedFor) headers["x-forwarded-for"] = result.forwardedFor

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(result.payload),
    cache: "no-store",
  })

  if (response.ok) {
    return jsonResponse(
      {
        ok: true,
        status: "received",
        message: "Thank you. Your message has been sent.",
      },
      200,
    )
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get("retry-after")
    return jsonResponse(
      {
        ok: false,
        error: "too_many_requests",
        message: "Too many submissions. Please try again later.",
      },
      429,
      retryAfter ? { "retry-after": retryAfter } : undefined,
    )
  }

  if (response.status >= 400 && response.status < 500) {
    return jsonResponse(
      {
        ok: false,
        error: "submission_rejected",
        message: "The form submission could not be accepted. Please check the fields and try again.",
      },
      400,
    )
  }

  return jsonResponse(
    {
      ok: false,
      error: "forms_unavailable",
      message: "Form submissions are temporarily unavailable.",
    },
    502,
  )
}

export const GET: APIRoute = methodNotAllowed
export const PUT: APIRoute = methodNotAllowed
export const PATCH: APIRoute = methodNotAllowed
export const DELETE: APIRoute = methodNotAllowed

