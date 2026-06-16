import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE "better_auth_users" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
      "email" text NOT NULL UNIQUE,
      "emailVerified" boolean NOT NULL,
      "image" text,
      "createdAt" timestamptz NOT NULL,
      "updatedAt" timestamptz NOT NULL,
      "payloadUserId" text NOT NULL UNIQUE
    );

    CREATE TABLE "better_auth_sessions" (
      "id" text PRIMARY KEY NOT NULL,
      "expiresAt" timestamptz NOT NULL,
      "token" text NOT NULL UNIQUE,
      "createdAt" timestamptz NOT NULL,
      "updatedAt" timestamptz NOT NULL,
      "ipAddress" text,
      "userAgent" text,
      "userId" text NOT NULL REFERENCES "better_auth_users"("id") ON DELETE cascade
    );

    CREATE TABLE "better_auth_accounts" (
      "id" text PRIMARY KEY NOT NULL,
      "accountId" text NOT NULL,
      "providerId" text NOT NULL,
      "userId" text NOT NULL REFERENCES "better_auth_users"("id") ON DELETE cascade,
      "accessToken" text,
      "refreshToken" text,
      "idToken" text,
      "accessTokenExpiresAt" timestamptz,
      "refreshTokenExpiresAt" timestamptz,
      "scope" text,
      "password" text,
      "createdAt" timestamptz NOT NULL,
      "updatedAt" timestamptz NOT NULL
    );

    CREATE TABLE "better_auth_verifications" (
      "id" text PRIMARY KEY NOT NULL,
      "identifier" text NOT NULL,
      "value" text NOT NULL,
      "expiresAt" timestamptz NOT NULL,
      "createdAt" timestamptz NOT NULL,
      "updatedAt" timestamptz NOT NULL
    );

    CREATE INDEX "better_auth_sessions_userId_idx" ON "better_auth_sessions" ("userId");
    CREATE INDEX "better_auth_accounts_userId_idx" ON "better_auth_accounts" ("userId");
    CREATE INDEX "better_auth_verifications_identifier_idx" ON "better_auth_verifications" ("identifier");
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "better_auth_verifications";
    DROP TABLE IF EXISTS "better_auth_accounts";
    DROP TABLE IF EXISTS "better_auth_sessions";
    DROP TABLE IF EXISTS "better_auth_users";
  `)
}
