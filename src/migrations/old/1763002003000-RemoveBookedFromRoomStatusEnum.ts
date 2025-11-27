import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveBookedFromRoomStatusEnum1763002003000
  implements MigrationInterface
{
  name = "RemoveBookedFromRoomStatusEnum1763002003000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."room_status_enum" RENAME TO "room_status_enum_old"`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."room_status_enum" AS ENUM('free', 'occupied', 'cleaning')`
    );
    await queryRunner.query(
      `UPDATE "room" SET "status" = 'free' WHERE "status" = 'booked'`
    );
    await queryRunner.query(
      `ALTER TABLE "room" ALTER COLUMN "status" DROP DEFAULT`
    );
    await queryRunner.query(
      `ALTER TABLE "room" ALTER COLUMN "status" TYPE "public"."room_status_enum" USING "status"::text::"public"."room_status_enum"`
    );
    await queryRunner.query(
      `ALTER TABLE "room" ALTER COLUMN "status" SET DEFAULT 'free'`
    );
    await queryRunner.query(`DROP TYPE "public"."room_status_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."room_status_enum" RENAME TO "room_status_enum_old"`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."room_status_enum" AS ENUM('free', 'booked', 'occupied', 'cleaning')`
    );
    await queryRunner.query(
      `ALTER TABLE "room" ALTER COLUMN "status" DROP DEFAULT`
    );
    await queryRunner.query(
      `ALTER TABLE "room" ALTER COLUMN "status" TYPE "public"."room_status_enum" USING "status"::text::"public"."room_status_enum"`
    );
    await queryRunner.query(
      `ALTER TABLE "room" ALTER COLUMN "status" SET DEFAULT 'free'`
    );
    await queryRunner.query(`DROP TYPE "public"."room_status_enum_old"`);
  }
}


