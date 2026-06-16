import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  const { docs: tenants } = await payload.find({
    collection: "tenants",
    limit: 0,
    overrideAccess: true,
    req,
  })

  for (const tenant of tenants) {
    const theme = (tenant as { theme?: Record<string, unknown> }).theme
    if (!theme || typeof theme !== "object") continue

    const next: Record<string, unknown> = { ...theme }
    const fonts = (theme.fonts ?? {}) as Record<string, string | undefined>
    let dirty = false

    // Map fonts.{sans,serif,script} → fonts.{title,heading,text} if legacy keys exist.
    if (fonts.sans !== undefined || fonts.serif !== undefined || fonts.script !== undefined) {
      const remapped: Record<string, string | undefined> = {
        text: fonts.sans,
        heading: fonts.serif,
        title: fonts.script ?? fonts.serif,
      }
      // Strip empty / undefined values so the result matches the strict schema.
      next.fonts = Object.fromEntries(
        Object.entries(remapped).filter(([, v]) => v),
      )
      dirty = true
    }

    // Initialise mode to "light" if unset.
    // darkPalette is intentionally NOT auto-derived (per R4 design spec § 1.4).
    if (next.mode === undefined) {
      next.mode = "light"
      dirty = true
    }

    if (dirty) {
      await payload.update({
        collection: "tenants",
        id: tenant.id,
        data: { theme: next } as never,
        overrideAccess: true,
        req,
      })
    }
  }
}

export async function down(_: MigrateDownArgs): Promise<void> {
  // No-op: forward-only migration. Restoring legacy keys would require
  // remembering them in a side table, which we explicitly chose not to do.
}
