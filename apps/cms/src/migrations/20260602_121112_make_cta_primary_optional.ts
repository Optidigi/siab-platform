import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_cta" ALTER COLUMN "primary_label" DROP NOT NULL;
  ALTER TABLE "pages_blocks_cta" ALTER COLUMN "primary_href" DROP NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   UPDATE "pages_blocks_cta" SET "primary_label" = '' WHERE "primary_label" IS NULL;
  UPDATE "pages_blocks_cta" SET "primary_href" = '' WHERE "primary_href" IS NULL;
  ALTER TABLE "pages_blocks_cta" ALTER COLUMN "primary_label" SET NOT NULL;
  ALTER TABLE "pages_blocks_cta" ALTER COLUMN "primary_href" SET NOT NULL;`)
}
