import { existsSync } from "node:fs"
import { readFile, stat } from "node:fs/promises"
import { extname, join, normalize, resolve, sep } from "node:path"

const DEFAULT_HOSTS = ["amblast.optidigi.nl"]
const PAGE_PATHS = new Map([
  ["/", "index.html"],
  ["/over-ons", "over-ons/index.html"],
  ["/diensten", "diensten/index.html"],
  ["/portfolio", "portfolio/index.html"],
  ["/contact", "contact/index.html"],
])
const REDIRECT_PATHS = new Map([
  ["/portfolio-1", "/portfolio"],
  ["/contact-pagina", "/contact"],
  ["/our-team", "/over-ons"],
])

const CONTENT_TYPES = new Map([
  [".avif", "image/avif"],
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".txt", "text/plain; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff2", "font/woff2"],
  [".xml", "application/xml; charset=utf-8"],
])

function configuredHosts() {
  const hosts = process.env.AMBLAST_LEGACY_HOSTS
  if (!hosts) return DEFAULT_HOSTS
  return hosts
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean)
}

export function isAmblastLegacyHost(host) {
  return configuredHosts().includes(host)
}

function candidateDistDirs() {
  const configured = process.env.AMBLAST_LEGACY_DIST_DIR
  const cwd = process.cwd()
  return [
    configured,
    "/app/legacy-tenants/amblast",
    resolve(cwd, "sites/amblast/dist"),
    resolve(cwd, "../../sites/amblast/dist"),
  ].filter(Boolean)
}

export function resolveAmblastDistDir() {
  return candidateDistDirs().find((dir) => existsSync(dir)) ?? null
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

function normalizePagePath(pathname) {
  const cleanPath = (pathname.split(/[?#]/, 1)[0] || "/").replace(/\/+$/, "") || "/"
  return safeDecodeURIComponent(cleanPath)
}

function legacyRelativePath(pathname) {
  const pagePath = PAGE_PATHS.get(normalizePagePath(pathname))
  if (pagePath) return pagePath

  const decodedPathname = safeDecodeURIComponent(pathname)
  if (!decodedPathname) return null
  const assetPath = normalize(decodedPathname.replace(/^\/+/, ""))
  if (!assetPath || assetPath.startsWith("..") || assetPath.includes(`${sep}..${sep}`)) return null
  return assetPath
}

function legacyRedirectLocation(pathname) {
  const cleanPath = normalizePagePath(pathname)
  if (!cleanPath) return null
  return REDIRECT_PATHS.get(cleanPath) ?? null
}

export async function resolveAmblastLegacyFile(pathname) {
  const distDir = resolveAmblastDistDir()
  const relativePath = legacyRelativePath(pathname)
  if (!distDir || !relativePath) return null

  const absolutePath = resolve(join(distDir, relativePath))
  const resolvedDistDir = resolve(distDir)
  if (absolutePath !== resolvedDistDir && !absolutePath.startsWith(`${resolvedDistDir}${sep}`)) return null

  try {
    const fileStat = await stat(absolutePath)
    if (!fileStat.isFile()) return null
    return absolutePath
  } catch {
    return null
  }
}

async function createResponseForFile(filePath, status = 200) {
  const body = await readFile(filePath)
  const extension = extname(filePath)
  const contentType = CONTENT_TYPES.get(extension) ?? "application/octet-stream"
  const headers = new Headers({
    "content-type": contentType,
    "permissions-policy": "geolocation=(), microphone=(), camera=()",
    "referrer-policy": "strict-origin-when-cross-origin",
    "x-content-type-options": "nosniff",
    "x-frame-options": "SAMEORIGIN",
    "content-security-policy":
      "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https://api.web3forms.com",
  })

  if (extension !== ".html") {
    headers.set("cache-control", "public, max-age=31536000, immutable")
  }

  return new Response(body, { headers, status })
}

export async function createAmblastLegacyResponse(pathname) {
  const redirectLocation = legacyRedirectLocation(pathname)
  if (redirectLocation) {
    return new Response(null, {
      status: 301,
      headers: {
        location: redirectLocation,
        "x-siab-legacy-tenant": "amblast",
      },
    })
  }

  const filePath = await resolveAmblastLegacyFile(pathname)
  if (!filePath) return null

  return createResponseForFile(filePath)
}

export async function createAmblastLegacyNotFoundResponse() {
  const distDir = resolveAmblastDistDir()
  if (!distDir) {
    return new Response("Not found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    })
  }

  const notFoundFile = resolve(join(distDir, "404.html"))
  try {
    const fileStat = await stat(notFoundFile)
    if (fileStat.isFile()) return createResponseForFile(notFoundFile, 404)
  } catch {
    // Fall back to a minimal response when the legacy 404 artifact is missing.
  }

  return new Response("Not found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  })
}

export async function createAmblastLegacyResponseOrNotFound(pathname) {
  return (await createAmblastLegacyResponse(pathname)) ?? createAmblastLegacyNotFoundResponse()
}
