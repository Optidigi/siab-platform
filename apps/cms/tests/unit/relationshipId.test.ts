import { describe, expect, it } from "vitest"
import { relationshipId, relationshipIdSet, sameRelationshipId } from "@/lib/relationshipId"

describe("relationshipId helpers", () => {
  it("normalizes raw and populated relationship IDs to strings", () => {
    expect(relationshipId(7)).toBe("7")
    expect(relationshipId("7")).toBe("7")
    expect(relationshipId({ id: 7 })).toBe("7")
    expect(relationshipId({ id: "7" })).toBe("7")
  })

  it("returns null for missing relationship IDs", () => {
    expect(relationshipId(null)).toBeNull()
    expect(relationshipId(undefined)).toBeNull()
    expect(relationshipId({})).toBeNull()
    expect(relationshipId({ id: null })).toBeNull()
  })

  it("compares only present normalized IDs", () => {
    expect(sameRelationshipId(7, "7")).toBe(true)
    expect(sameRelationshipId({ id: 7 }, "7")).toBe(true)
    expect(sameRelationshipId({ id: 7 }, { id: 8 })).toBe(false)
    expect(sameRelationshipId(null, null)).toBe(false)
  })

  it("builds sets without null entries", () => {
    expect(relationshipIdSet([1, "2", { id: 3 }, null, { id: null }])).toEqual(
      new Set(["1", "2", "3"]),
    )
  })
})
