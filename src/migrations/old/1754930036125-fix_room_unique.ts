// src/migrations/1754930036125-fix_room_unique.ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class FixRoomUnique1754930036125 implements MigrationInterface {
  name = "FixRoomUnique1754930036125";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Зняти глобальний UQ з roomNumber (імʼя може відрізнятись — звірь з твоєю БД)
    await queryRunner.query(
      `ALTER TABLE "room" DROP CONSTRAINT IF EXISTS "UQ_5f394ba13302b7ddca879251245"`
    );

    // 2) Додати складений UQ (adminId, roomNumber)
    await queryRunner.query(
      `ALTER TABLE "room" ADD CONSTRAINT "UQ_room_admin_roomNumber" UNIQUE ("adminId","roomNumber")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "room" DROP CONSTRAINT IF EXISTS "UQ_room_admin_roomNumber"`
    );
    await queryRunner.query(
      `ALTER TABLE "room" ADD CONSTRAINT "UQ_5f394ba13302b7ddca879251245" UNIQUE ("roomNumber")`
    );
  }
}
