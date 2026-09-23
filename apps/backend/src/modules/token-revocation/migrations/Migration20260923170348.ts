import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260923170348 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "revoked_jwt" ("id" text not null, "expires_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "revoked_jwt_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_revoked_jwt_deleted_at" ON "revoked_jwt" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_revoked_jwt_expires_at" ON "revoked_jwt" ("expires_at");`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "revoked_jwt" cascade;`);
  }

}
