import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // 1. Remap any legacy 'form' or 'preview' rows to 'canvas' BEFORE the enum
  //    constraint is narrowed — prevents any row from violating the new enum.
  //    Cast to text for the IN comparison so the literal 'preview' doesn't
  //    have to be a valid enum value — earlier deploys of the enum (commit
  //    20260514_001339) only created ('canvas', 'form'); 'preview' was a dev
  //    transient that never reached every environment. The text cast makes
  //    this migration safe regardless of which earlier enum members existed.
  await db.execute(sql`
   UPDATE "users"
   SET "editor_mode" = 'canvas'
   WHERE "editor_mode"::text IN ('form', 'preview');`)

  // 2. Narrow the enum: cast column to text, drop old type, create narrowed
  //    type, re-cast column using the new type. All existing rows are now
  //    either NULL, 'canvas', or 'sidebar' so the USING cast is safe.
  await db.execute(sql`
   ALTER TABLE "users" ALTER COLUMN "editor_mode" SET DATA TYPE text;
  DROP TYPE "public"."enum_users_editor_mode";
  CREATE TYPE "public"."enum_users_editor_mode" AS ENUM('canvas', 'sidebar');
  ALTER TABLE "users" ALTER COLUMN "editor_mode" SET DATA TYPE "public"."enum_users_editor_mode" USING "editor_mode"::"public"."enum_users_editor_mode";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  throw new Error(
    "Rollback of narrow_editor_mode is destructive and not supported. " +
    "The 'form' and 'preview' enum values were collapsed to 'canvas' during up(); " +
    "that mapping cannot be reversed without data loss."
  )
}
