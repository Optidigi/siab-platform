import { ensureE2ESeed } from "./_seed"

export default async function globalSetup() {
  await ensureE2ESeed()
}
