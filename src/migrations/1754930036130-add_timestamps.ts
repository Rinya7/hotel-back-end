import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTimestamps1754930036130 implements MigrationInterface {
  name = "AddTimestamps1754930036130";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // admin: createdAt/updatedAt
    await queryRunner.query(
      `ALTER TABLE "admin" 
         ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
         ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`
    );

    // room: createdAt/updatedAt
    await queryRunner.query(
      `ALTER TABLE "room" 
         ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
         ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "room" 
         DROP COLUMN IF EXISTS "updatedAt",
         DROP COLUMN IF EXISTS "createdAt"`
    );
    await queryRunner.query(
      `ALTER TABLE "admin" 
         DROP COLUMN IF EXISTS "updatedAt",
         DROP COLUMN IF EXISTS "createdAt"`
    );
  }
}
