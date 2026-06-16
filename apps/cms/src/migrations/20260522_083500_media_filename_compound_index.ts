import type { MigrateDownArgs, MigrateUpArgs } from "@payloadcms/db-postgres"
import { sql } from "@payloadcms/db-postgres"

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF to_regclass('public.media_filename_compound_idx') IS NULL THEN
        IF to_regclass('public.media_tenant_filename_idx') IS NOT NULL THEN
          ALTER INDEX "media_tenant_filename_idx" RENAME TO "media_filename_compound_idx";
        ELSE
          CREATE UNIQUE INDEX "media_filename_compound_idx" ON "media" USING btree ("tenant_id", "filename");
        END IF;
      END IF;
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF to_regclass('public.media_tenant_filename_idx') IS NULL THEN
        IF to_regclass('public.media_filename_compound_idx') IS NOT NULL THEN
          ALTER INDEX "media_filename_compound_idx" RENAME TO "media_tenant_filename_idx";
        ELSE
          CREATE UNIQUE INDEX "media_tenant_filename_idx" ON "media" USING btree ("tenant_id", "filename");
        END IF;
      END IF;
    END $$;
  `)
}
