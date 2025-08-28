// src/migrations/1754930036132_add_policy_hours_to_admin.ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPolicyHoursToAdmin1754930036132 implements MigrationInterface {
  name = "AddPolicyHoursToAdmin1754930036132";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "admin" ADD COLUMN "checkInHour" int NOT NULL DEFAULT 14`
    );
    await queryRunner.query(
      `ALTER TABLE "admin" ADD COLUMN "checkOutHour" int NOT NULL DEFAULT 10`
    );
    await queryRunner.query(
      `ALTER TABLE "admin" ADD CONSTRAINT "CHK_admin_checkin_0_23" CHECK ("checkInHour" >= 0 AND "checkInHour" <= 23)`
    );
    await queryRunner.query(
      `ALTER TABLE "admin" ADD CONSTRAINT "CHK_admin_checkout_0_23" CHECK ("checkOutHour" >= 0 AND "checkOutHour" <= 23)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "admin" DROP CONSTRAINT "CHK_admin_checkout_0_23"`
    );
    await queryRunner.query(
      `ALTER TABLE "admin" DROP CONSTRAINT "CHK_admin_checkin_0_23"`
    );
    await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "checkOutHour"`);
    await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "checkInHour"`);
  }
}
