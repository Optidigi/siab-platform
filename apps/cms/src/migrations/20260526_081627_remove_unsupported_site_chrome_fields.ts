import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" DROP COLUMN "chrome_header_tagline";
  ALTER TABLE "site_settings" DROP COLUMN "chrome_header_cta_label";
  ALTER TABLE "site_settings" DROP COLUMN "chrome_header_cta_href";
  ALTER TABLE "site_settings" DROP COLUMN "chrome_footer_cta_label";
  ALTER TABLE "site_settings" DROP COLUMN "chrome_footer_cta_href";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" ADD COLUMN "chrome_header_tagline" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "chrome_header_cta_label" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "chrome_header_cta_href" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "chrome_footer_cta_label" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "chrome_footer_cta_href" varchar;`)
}
