import { MigrationInterface, QueryRunner } from "typeorm";

export class ExtendRoomStatusEnum1763002002000 implements MigrationInterface {
  name = "ExtendRoomStatusEnum1763002002000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."room_status_enum" ADD VALUE IF NOT EXISTS 'cleaning'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."room_status_enum_old" AS ENUM('free', 'booked', 'occupied')`
    );
    await queryRunner.query(
      `ALTER TABLE "room" ALTER COLUMN "status" TYPE "public"."room_status_enum_old" USING "status"::text::"public"."room_status_enum_old"`
    );
    await queryRunner.query(`DROP TYPE "public"."room_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."room_status_enum_old" RENAME TO "room_status_enum"`
    );
  }
}




