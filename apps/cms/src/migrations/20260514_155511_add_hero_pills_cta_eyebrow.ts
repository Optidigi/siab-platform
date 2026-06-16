import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "pages_blocks_hero_pills" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL
  );
  
  ALTER TABLE "pages_blocks_cta" ADD COLUMN "eyebrow" jsonb;
  ALTER TABLE "pages_blocks_hero_pills" ADD CONSTRAINT "pages_blocks_hero_pills_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_hero_pills_order_idx" ON "pages_blocks_hero_pills" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_pills_parent_id_idx" ON "pages_blocks_hero_pills" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pages_blocks_hero_pills" CASCADE;
  ALTER TABLE "pages_blocks_cta" DROP COLUMN "eyebrow";`)
}
