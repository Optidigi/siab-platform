import "dotenv/config"
import { getPayload } from "payload"
import config from "@/payload.config"
import { writeFileSync, mkdirSync, rmSync } from "node:fs"
import { resolve } from "node:path"
import { parseFragment } from "parse5"
import { mapHtmlToRt } from "@/lib/richText/mapper"
import { matchersForManifest } from "@/lib/richText/themedMatchers/index"
import { rtRootSchema } from "@/lib/richText/rtNodeSchema"
import { validateAgainstManifest } from "@/lib/richText/validateAgainstManifest"
import { loadTenantManifest } from "@/lib/richText/loadManifest"

type Mode = "scout" | "dry-run" | "apply"

const parseArgs = () => {
  const a = process.argv.slice(2)
  const out: { mode: Mode; tenant?: string } = { mode: "apply" }
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--scout") out.mode = "scout"
    else if (a[i] === "--dry-run") out.mode = "dry-run"
    else if (a[i] === "--tenant") out.tenant = a[++i]
  }
  return out
}

const DATA_DIR = process.env.DATA_DIR ?? resolve(process.cwd(), ".data")
const stamp = new Date().toISOString().replace(/[:.]/g, "-")
const BACKUP_BASE = resolve(DATA_DIR, "migrations-backup", `richtext-v2-${stamp}`)

const acquireLock = (tenant: string | undefined): string => {
  mkdirSync(resolve(DATA_DIR, "migrations-backup"), { recursive: true })
  const lockPath = resolve(DATA_DIR, "migrations-backup", `.lock-${tenant ?? "all"}`)
  try {
    writeFileSync(lockPath, String(process.pid), { flag: "wx" })
  } catch (e: any) {
    if (e?.code === "EEXIST") {
      console.error(`Another migration is in progress for tenant=${tenant ?? "all"} (lock: ${lockPath}). Remove it manually if the previous run crashed.`)
      process.exit(1)
    }
    throw e
  }
  const release = () => { try { rmSync(lockPath) } catch {} }
  process.on("exit", release)
  process.on("SIGINT", () => { release(); process.exit(130) })
  process.on("SIGTERM", () => { release(); process.exit(143) })
  return lockPath
}

const collectSignatures = (html: string, into: Map<string, { count: number; samplePages: Set<string> }>, pageKey: string) => {
  if (!html || typeof html !== "string" || !html.includes("<")) return
  const frag = parseFragment(html)
  const visit = (n: any) => {
    if (n.nodeName === "#text") return
    if ("tagName" in n) {
      const cls = (n.attrs?.find((a: any) => a.name === "class")?.value ?? "").split(/\s+/).filter(Boolean).sort().join(".")
      const key = cls ? `${n.tagName}.${cls}` : n.tagName
      const entry = into.get(key) ?? { count: 0, samplePages: new Set() }
      entry.count++; entry.samplePages.add(pageKey)
      into.set(key, entry)
    }
    for (const c of n.childNodes ?? []) visit(c)
  }
  for (const c of frag.childNodes) visit(c)
}

const stringFieldNamesFromBlock = (blockType: string): string[] => {
  switch (blockType) {
    case "richText":        return ["body"]
    case "hero":            return ["eyebrow", "headline", "subheadline"]
    case "featureList":     return ["title", "intro"]
    case "faq":             return ["title"]
    case "cta":             return ["headline", "description"]
    case "contactSection":  return ["title", "description"]
    default:                return []
  }
}

const fieldVariantForBlock = (blockType: string, fieldName: string): "block" | "inline" => {
  if (blockType === "richText" && fieldName === "body") return "block"
  if (blockType === "hero" && (fieldName === "eyebrow" || fieldName === "headline")) return "inline"
  if (blockType === "hero" && fieldName === "subheadline") return "block"
  if (blockType === "featureList" && fieldName === "title") return "inline"
  if (blockType === "featureList" && fieldName === "intro") return "block"
  if (blockType === "faq" && fieldName === "title") return "inline"
  if (blockType === "cta" && fieldName === "headline") return "inline"
  if (blockType === "cta" && fieldName === "description") return "block"
  if (blockType === "contactSection" && fieldName === "title") return "inline"
  if (blockType === "contactSection" && fieldName === "description") return "block"
  return "block"
}

const main = async () => {
  const args = parseArgs()
  const payload = await getPayload({ config })

  const tenantFilter = args.tenant
    ? (await payload.find({ collection: "tenants", where: { slug: { equals: args.tenant } }, limit: 1, overrideAccess: true })).docs[0]
    : null
  if (args.tenant && !tenantFilter) { console.error(`tenant slug "${args.tenant}" not found`); process.exit(1) }

  mkdirSync(resolve(DATA_DIR, "migrations-backup"), { recursive: true })

  if (args.mode === "scout") {
    const sigs = new Map<string, { count: number; samplePages: Set<string> }>()
    const pages = await payload.find({
      collection: "pages",
      ...(tenantFilter ? { where: { tenant: { equals: tenantFilter.id } } as any } : {}),
      limit: 1000,
      overrideAccess: true,
    })
    for (const p of pages.docs as any[]) {
      const key = `${(p.tenant as any)?.slug ?? "?"}/${p.slug}`
      for (const block of p.blocks ?? []) {
        const fields = stringFieldNamesFromBlock(block.blockType)
        for (const f of fields) {
          const v = block[f]
          if (typeof v === "string") collectSignatures(v, sigs, key)
        }
      }
    }

    mkdirSync(BACKUP_BASE, { recursive: true })
    const lines: string[] = [`# Scout report (${stamp})`, ""]
    for (const [sig, info] of Array.from(sigs.entries()).sort((a, b) => b[1].count - a[1].count)) {
      lines.push(`- \`${sig}\` — ${info.count} occurrences across ${info.samplePages.size} pages (e.g. ${Array.from(info.samplePages).slice(0, 3).join(", ")})`)
    }
    writeFileSync(resolve(BACKUP_BASE, `scout-${args.tenant ?? "all"}.md`), lines.join("\n"))
    console.log(`scout report written to ${BACKUP_BASE}/scout-${args.tenant ?? "all"}.md`)
    process.exit(0)
  }

  if (args.mode === "apply") {
    acquireLock(args.tenant)
  }

  if (args.mode === "dry-run" || args.mode === "apply") {
    if (!tenantFilter) { console.error("--tenant is required for dry-run/apply"); process.exit(1) }
    const manifest = await loadTenantManifest(tenantFilter.id)
    const matchers = matchersForManifest(manifest)
    mkdirSync(BACKUP_BASE, { recursive: true })

    const pages = await payload.find({
      collection: "pages",
      where: { tenant: { equals: tenantFilter.id } } as any,
      limit: 1000,
      overrideAccess: true,
    })

    const report: string[] = [`# ${args.mode} report (${stamp}) — tenant ${tenantFilter.slug}`, ""]
    let errors = 0

    for (const p of pages.docs as any[]) {
      const newBlocks = []
      for (const block of p.blocks ?? []) {
        const fields = stringFieldNamesFromBlock(block.blockType)
        const out: any = { ...block }
        for (const f of fields) {
          const raw = block[f]
          if (typeof raw !== "string") continue
          const variant = fieldVariantForBlock(block.blockType, f)
          const rt = mapHtmlToRt(raw, { variant, manifest, themedMatchers: matchers })
          const struct = rtRootSchema.safeParse(rt)
          if (!struct.success) {
            errors++
            report.push(`- ❌ ${p.slug} / block ${block.blockType} / field ${f}: ${struct.error.issues[0]?.message ?? "schema fail"}`)
            continue
          }
          const m = validateAgainstManifest(rt as any, manifest)
          if (!m.ok) {
            errors++
            report.push(`- ❌ ${p.slug} / block ${block.blockType} / field ${f}: ${m.errors.join("; ")}`)
            continue
          }
          out[f] = rt
          report.push(`- ✓ ${p.slug} / block ${block.blockType} / field ${f}: ${(rt as any).children.length} child(ren)`)
        }
        newBlocks.push(out)
      }
      if (args.mode === "apply") {
        writeFileSync(resolve(BACKUP_BASE, `${p.id}.json`), JSON.stringify(p, null, 2))
        await payload.update({
          collection: "pages", id: p.id as any,
          data: { blocks: newBlocks } as any,
          overrideAccess: true,
        })
      }
    }

    writeFileSync(resolve(BACKUP_BASE, `${args.mode}-${tenantFilter.slug}.md`), report.join("\n"))
    console.log(`${args.mode} report written; ${errors} errors`)
    process.exit(errors > 0 ? 2 : 0)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
