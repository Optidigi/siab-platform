import assert from "node:assert/strict"
import test from "node:test"

import { pathnameToSlug } from "./pathname.js"

test("safely rejects malformed encoded pathnames", () => {
  assert.equal(pathnameToSlug("/%E0%A4%A"), null)
})
