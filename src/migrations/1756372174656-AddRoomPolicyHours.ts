// src/migrations/17249XXXXXXXX-AddRoomPolicyHours.ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRoomPolicyHours17249XXXXXXXX implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "room" ADD COLUMN "checkInHour" int NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "room" ADD COLUMN "checkOutHour" int NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "room" ADD CONSTRAINT "CHK_room_checkin_0_23" CHECK ("checkInHour" IS NULL OR ("checkInHour" BETWEEN 0 AND 23))`
    );
    await queryRunner.query(
      `ALTER TABLE "room" ADD CONSTRAINT "CHK_room_checkout_0_23" CHECK ("checkOutHour" IS NULL OR ("checkOutHour" BETWEEN 0 AND 23))`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "room" DROP CONSTRAINT "CHK_room_checkout_0_23"`
    );
    await queryRunner.query(
      `ALTER TABLE "room" DROP CONSTRAINT "CHK_room_checkin_0_23"`
    );
    await queryRunner.query(`ALTER TABLE "room" DROP COLUMN "checkOutHour"`);
    await queryRunner.query(`ALTER TABLE "room" DROP COLUMN "checkInHour"`);
  }
}
