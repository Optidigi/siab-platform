import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_editor_mode" AS ENUM('canvas', 'form');
  ALTER TABLE "users" ADD COLUMN "editor_mode" "enum_users_editor_mode";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" DROP COLUMN "editor_mode";
  DROP TYPE "public"."enum_users_editor_mode";`)
}
