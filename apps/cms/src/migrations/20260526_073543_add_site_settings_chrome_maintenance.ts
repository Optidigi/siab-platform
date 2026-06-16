import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" ADD COLUMN "branding_favicon_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "chrome_header_tagline" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "chrome_header_cta_label" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "chrome_header_cta_href" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "chrome_footer_tagline" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "chrome_footer_copyright" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "chrome_footer_cta_label" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "chrome_footer_cta_href" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "maintenance_enabled" boolean DEFAULT false;
  ALTER TABLE "site_settings" ADD COLUMN "maintenance_message" varchar;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_branding_favicon_id_media_id_fk" FOREIGN KEY ("branding_favicon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "site_settings_branding_branding_favicon_idx" ON "site_settings" USING btree ("branding_favicon_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_branding_favicon_id_media_id_fk";
  
  DROP INDEX "site_settings_branding_branding_favicon_idx";
  ALTER TABLE "site_settings" DROP COLUMN "branding_favicon_id";
  ALTER TABLE "site_settings" DROP COLUMN "chrome_header_tagline";
  ALTER TABLE "site_settings" DROP COLUMN "chrome_header_cta_label";
  ALTER TABLE "site_settings" DROP COLUMN "chrome_header_cta_href";
  ALTER TABLE "site_settings" DROP COLUMN "chrome_footer_tagline";
  ALTER TABLE "site_settings" DROP COLUMN "chrome_footer_copyright";
  ALTER TABLE "site_settings" DROP COLUMN "chrome_footer_cta_label";
  ALTER TABLE "site_settings" DROP COLUMN "chrome_footer_cta_href";
  ALTER TABLE "site_settings" DROP COLUMN "maintenance_enabled";
  ALTER TABLE "site_settings" DROP COLUMN "maintenance_message";`)
}
