import "dotenv/config"
import { getPayload } from "payload"
import config from "@/payload.config"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { resolve } from "node:path"

const main = async () => {
  const dir = process.argv[2]
  if (!dir) { console.error("usage: restore-richtext-v2.ts <backup-dir>"); process.exit(1) }
  const abs = resolve(dir)
  if (!statSync(abs).isDirectory()) { console.error("not a directory:", abs); process.exit(1) }

  const payload = await getPayload({ config })
  const files = readdirSync(abs).filter((f) => f.endsWith(".json") && !f.includes("scout") && !f.includes("dry-run") && !f.includes("apply"))

  for (const f of files) {
    const raw = JSON.parse(readFileSync(resolve(abs, f), "utf-8"))
    await payload.update({
      collection: "pages",
      id: raw.id as any,
      data: { blocks: raw.blocks } as any,
      overrideAccess: true,
    })
    console.log(`restored page ${raw.slug}`)
  }
  console.log(`restored ${files.length} pages from ${abs}`)
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
