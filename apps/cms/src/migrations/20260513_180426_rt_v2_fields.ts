/**
 * Rich text v2 — Phase 1: convert rich-text-bearing columns from text/varchar to jsonb.
 *
 * Affected columns first DROP NOT NULL (where present) then SET DATA TYPE
 * jsonb USING NULL — wipes existing content. Repopulation paths:
 *   - scripts/migrate-richtext-v2.ts (HTML→RtNode mapper against live varchar DB)
 *   - scripts/repopulate-richtext-from-snapshot-entry.ts (one-off from a
 *     prior projection JSON snapshot; used for the ami-care prod cutover)
 */
import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // DROP NOT NULL on the columns that have it (hero.headline,
  // feature_list_features.title, cta.headline, rich_text.body,
  // faq_items.{question,answer}). `SET DATA TYPE jsonb USING NULL`
  // would otherwise violate NOT NULL when it nulls existing rows.
  // After migration these fields are RtRoot jsonb and stay nullable
  // until the repopulate script writes mapped content back; the new
  // collection schema treats RT fields as optional in Payload (the
  // `validateRichTextOnSave` hook checks structure when present, not
  // presence).
  await db.execute(sql`
   ALTER TABLE "pages_blocks_hero" ALTER COLUMN "headline" DROP NOT NULL;
  ALTER TABLE "pages_blocks_feature_list_features" ALTER COLUMN "title" DROP NOT NULL;
  ALTER TABLE "pages_blocks_cta" ALTER COLUMN "headline" DROP NOT NULL;
  ALTER TABLE "pages_blocks_rich_text" ALTER COLUMN "body" DROP NOT NULL;
  ALTER TABLE "pages_blocks_faq_items" ALTER COLUMN "question" DROP NOT NULL;
  ALTER TABLE "pages_blocks_faq_items" ALTER COLUMN "answer" DROP NOT NULL;
  ALTER TABLE "pages_blocks_hero" ALTER COLUMN "eyebrow" SET DATA TYPE jsonb USING NULL;
  ALTER TABLE "pages_blocks_hero" ALTER COLUMN "headline" SET DATA TYPE jsonb USING NULL;
  ALTER TABLE "pages_blocks_hero" ALTER COLUMN "subheadline" SET DATA TYPE jsonb USING NULL;
  ALTER TABLE "pages_blocks_feature_list_features" ALTER COLUMN "title" SET DATA TYPE jsonb USING NULL;
  ALTER TABLE "pages_blocks_feature_list_features" ALTER COLUMN "description" SET DATA TYPE jsonb USING NULL;
  ALTER TABLE "pages_blocks_feature_list" ALTER COLUMN "title" SET DATA TYPE jsonb USING NULL;
  ALTER TABLE "pages_blocks_feature_list" ALTER COLUMN "intro" SET DATA TYPE jsonb USING NULL;
  ALTER TABLE "pages_blocks_faq_items" ALTER COLUMN "question" SET DATA TYPE jsonb USING NULL;
  ALTER TABLE "pages_blocks_faq_items" ALTER COLUMN "answer" SET DATA TYPE jsonb USING NULL;
  ALTER TABLE "pages_blocks_faq" ALTER COLUMN "title" SET DATA TYPE jsonb USING NULL;
  ALTER TABLE "pages_blocks_cta" ALTER COLUMN "headline" SET DATA TYPE jsonb USING NULL;
  ALTER TABLE "pages_blocks_cta" ALTER COLUMN "description" SET DATA TYPE jsonb USING NULL;
  ALTER TABLE "pages_blocks_rich_text" ALTER COLUMN "body" SET DATA TYPE jsonb USING NULL;
  ALTER TABLE "pages_blocks_contact_section" ALTER COLUMN "title" SET DATA TYPE jsonb USING NULL;
  ALTER TABLE "pages_blocks_contact_section" ALTER COLUMN "description" SET DATA TYPE jsonb USING NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_hero" ALTER COLUMN "eyebrow" SET DATA TYPE varchar USING NULL;
  ALTER TABLE "pages_blocks_hero" ALTER COLUMN "headline" SET DATA TYPE varchar USING NULL;
  ALTER TABLE "pages_blocks_hero" ALTER COLUMN "subheadline" SET DATA TYPE varchar USING NULL;
  ALTER TABLE "pages_blocks_feature_list_features" ALTER COLUMN "title" SET DATA TYPE varchar USING NULL;
  ALTER TABLE "pages_blocks_feature_list_features" ALTER COLUMN "description" SET DATA TYPE varchar USING NULL;
  ALTER TABLE "pages_blocks_feature_list" ALTER COLUMN "title" SET DATA TYPE varchar USING NULL;
  ALTER TABLE "pages_blocks_feature_list" ALTER COLUMN "intro" SET DATA TYPE varchar USING NULL;
  ALTER TABLE "pages_blocks_faq_items" ALTER COLUMN "question" SET DATA TYPE varchar USING NULL;
  ALTER TABLE "pages_blocks_faq_items" ALTER COLUMN "answer" SET DATA TYPE varchar USING NULL;
  ALTER TABLE "pages_blocks_faq" ALTER COLUMN "title" SET DATA TYPE varchar USING NULL;
  ALTER TABLE "pages_blocks_cta" ALTER COLUMN "headline" SET DATA TYPE varchar USING NULL;
  ALTER TABLE "pages_blocks_cta" ALTER COLUMN "description" SET DATA TYPE varchar USING NULL;
  ALTER TABLE "pages_blocks_rich_text" ALTER COLUMN "body" SET DATA TYPE varchar USING NULL;
  ALTER TABLE "pages_blocks_contact_section" ALTER COLUMN "title" SET DATA TYPE varchar USING NULL;
  ALTER TABLE "pages_blocks_contact_section" ALTER COLUMN "description" SET DATA TYPE varchar USING NULL;`)
}
