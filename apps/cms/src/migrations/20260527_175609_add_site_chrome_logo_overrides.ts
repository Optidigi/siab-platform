import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" ADD COLUMN "chrome_header_logo_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "chrome_footer_logo_id" integer;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_chrome_header_logo_id_media_id_fk" FOREIGN KEY ("chrome_header_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_chrome_footer_logo_id_media_id_fk" FOREIGN KEY ("chrome_footer_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "site_settings_chrome_header_chrome_header_logo_idx" ON "site_settings" USING btree ("chrome_header_logo_id");
  CREATE INDEX "site_settings_chrome_footer_chrome_footer_logo_idx" ON "site_settings" USING btree ("chrome_footer_logo_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_chrome_header_logo_id_media_id_fk";
  
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_chrome_footer_logo_id_media_id_fk";
  
  DROP INDEX "site_settings_chrome_header_chrome_header_logo_idx";
  DROP INDEX "site_settings_chrome_footer_chrome_footer_logo_idx";
  ALTER TABLE "site_settings" DROP COLUMN "chrome_header_logo_id";
  ALTER TABLE "site_settings" DROP COLUMN "chrome_footer_logo_id";`)
}
