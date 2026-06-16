/**
 * OBS-69 — drop the NOT NULL invariant from the 6 rich-text json columns.
 *
 * Background: the rt-v2 migration (20260513_180426_rt_v2_fields) converted
 * these columns to jsonb and DROPped NOT NULL, but the block configs kept a
 * stale `required: true` (a leftover from the pre-rt-v2 varchar schema). The
 * generated schema snapshot therefore claimed notNull:true while the actual
 * migration-built DB left them nullable — a drift that surfaced only as a
 * dev-push `SET NOT NULL` failure on real (legitimately null) prod rows.
 *
 * This migration records the columns as nullable to match (a) the prod DB,
 * (b) the rt-v2 migration's stated intent ("treats RT fields as optional"),
 * and (c) the now-corrected block configs. `validateRichTextOnSave` still
 * structurally validates these fields when a value is present.
 */
import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_hero" ALTER COLUMN "headline" DROP NOT NULL;
  ALTER TABLE "pages_blocks_feature_list_features" ALTER COLUMN "title" DROP NOT NULL;
  ALTER TABLE "pages_blocks_faq_items" ALTER COLUMN "question" DROP NOT NULL;
  ALTER TABLE "pages_blocks_faq_items" ALTER COLUMN "answer" DROP NOT NULL;
  ALTER TABLE "pages_blocks_cta" ALTER COLUMN "headline" DROP NOT NULL;
  ALTER TABLE "pages_blocks_rich_text" ALTER COLUMN "body" DROP NOT NULL;`)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Irreversible by design. Re-adding NOT NULL would fail on any legitimately
  // null rich-text row (the exact OBS-69 failure mode this migration fixes),
  // so a silent rollback is more dangerous than a hard stop.
  throw new Error(
    'Migration 20260520_061420_drop_rt_field_required is not reversible: ' +
      're-applying NOT NULL would break on null rich-text rows. Restore from a backup instead.',
  )
}
