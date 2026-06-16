#!/usr/bin/env node

const DEFAULT_HOST = "https://app.posthog.com"
const DEFAULT_WEB_VITALS = ["CLS", "FCP", "INP", "LCP"]

const usage = () => {
  console.error(`usage: node scripts/sync-posthog-project-settings.mjs [--app-url <url> ...] [--dry-run]

Required environment:
  POSTHOG_PERSONAL_API_KEY   Personal API key with project settings access.
  POSTHOG_PROJECT_ID         PostHog project/environment id.

Optional environment:
  POSTHOG_HOST               Defaults to ${DEFAULT_HOST}.
  POSTHOG_ORGANIZATION_ID    Enables the organization-scoped project endpoint.
  POSTHOG_APP_URLS           Comma-separated URLs to merge with --app-url.

The script enables PostHog-native Web Vitals/performance settings and merges
authorized URLs for generated SIAB sites. It never stores API keys in the repo.`)
}

const args = process.argv.slice(2)
const cliUrls = []
let dryRun = false

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i]
  if (arg === "--dry-run") {
    dryRun = true
  } else if (arg === "--app-url") {
    const value = args[i + 1]
    if (!value) {
      usage()
      process.exit(2)
    }
    cliUrls.push(value)
    i += 1
  } else if (arg === "-h" || arg === "--help") {
    usage()
    process.exit(0)
  } else {
    console.error(`unknown argument: ${arg}`)
    usage()
    process.exit(2)
  }
}

const apiKey = process.env.POSTHOG_PERSONAL_API_KEY || process.env.POSTHOG_API_KEY
const projectId = process.env.POSTHOG_PROJECT_ID
const organizationId = process.env.POSTHOG_ORGANIZATION_ID
const host = (process.env.POSTHOG_HOST || DEFAULT_HOST).replace(/\/+$/, "")
const envUrls = (process.env.POSTHOG_APP_URLS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean)

if (!apiKey || !projectId) {
  usage()
  process.exit(2)
}

const normalizeUrl = (value) => {
  const url = new URL(value)
  url.hash = ""
  url.search = ""
  url.pathname = url.pathname.replace(/\/+$/, "") || "/"
  return url.toString().replace(/\/$/, "")
}

const requestedUrls = [...envUrls, ...cliUrls].map(normalizeUrl)
const endpoint = organizationId
  ? `${host}/api/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}/`
  : `${host}/api/projects/${encodeURIComponent(projectId)}/`

const request = async (method, body) => {
  const response = await fetch(endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`${method} ${endpoint} failed: ${response.status} ${text.slice(0, 500)}`)
  }

  return response.json()
}

const current = await request("GET")
const currentUrls = Array.isArray(current.app_urls) ? current.app_urls.filter(Boolean) : []
const appUrls = Array.from(new Set([...currentUrls, ...requestedUrls])).sort()

const patch = {
  app_urls: appUrls,
  autocapture_opt_out: false,
  autocapture_web_vitals_opt_in: true,
  autocapture_web_vitals_allowed_metrics: DEFAULT_WEB_VITALS,
  capture_performance_opt_in: true,
}

if (dryRun) {
  console.log(JSON.stringify({ endpoint, patch }, null, 2))
} else {
  const updated = await request("PATCH", patch)
  console.log(`Synced PostHog project settings for project ${projectId}`)
  console.log(`  Autocapture: ${updated.autocapture_opt_out === false ? "enabled" : "unknown"}`)
  console.log(`  Web Vitals: ${updated.autocapture_web_vitals_opt_in ? "enabled" : "unknown"}`)
  console.log(`  Performance capture: ${updated.capture_performance_opt_in ? "enabled" : "unknown"}`)
  console.log(`  App URLs: ${appUrls.length}`)
  for (const url of appUrls) console.log(`    ${url}`)
}
