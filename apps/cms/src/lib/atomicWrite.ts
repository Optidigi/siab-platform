import { promises as fs } from "node:fs"
import path from "node:path"

export async function writeAtomic(target: string, content: string): Promise<void> {
  const dir = path.dirname(target)
  await fs.mkdir(dir, { recursive: true })

  const tmp = `${target}.tmp.${process.pid}.${Date.now()}`
  try {
    const fh = await fs.open(tmp, "w")
    try {
      await fh.writeFile(content)
      await fh.sync()
    } finally {
      await fh.close()
    }
    await fs.rename(tmp, target)
  } catch (err) {
    // Best-effort cleanup of the temp file. Suppress unlink errors so a
    // missing tmp (e.g. fs.open never succeeded) or a permission glitch on
    // cleanup doesn't mask the original write/rename failure that the caller
    // needs to see.
    await fs.unlink(tmp).catch(() => {})
    throw err
  }
}
