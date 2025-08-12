// src/migrations/17xxxxx-room-unique-by-admin.ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class RoomUniqueByAdmin17xxxxx implements MigrationInterface {
  name = "RoomUniqueByAdmin17xxxxx";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // снять старый уникальный констрейнт на roomNumber
    await queryRunner.query(`
      ALTER TABLE "room" DROP CONSTRAINT IF EXISTS "UQ_5f394ba13302b7ddca879251245";
    `);
    // добавить составной уникальный констрейнт
    await queryRunner.query(`
      ALTER TABLE "room" ADD CONSTRAINT "UQ_room_admin_roomnumber"
      UNIQUE ("adminId", "roomNumber");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // откат: убрать составной и вернуть старый
    await queryRunner.query(`
      ALTER TABLE "room" DROP CONSTRAINT IF EXISTS "UQ_room_admin_roomnumber";
    `);
    await queryRunner.query(`
      ALTER TABLE "room" ADD CONSTRAINT "UQ_5f394ba13302b7ddca879251245"
      UNIQUE ("roomNumber");
    `);
  }
}
