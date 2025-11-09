import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRoomCleaningLog1763002000000 implements MigrationInterface {
  name = "AddRoomCleaningLog1763002000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "room" ADD COLUMN "lastCleanedAt" TIMESTAMP NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "room" ADD COLUMN "lastCleanedBy" character varying(50) NULL`
    );

    await queryRunner.query(`
      CREATE TABLE "room_cleaning_log" (
        "id" SERIAL NOT NULL,
        "cleanedBy" character varying(50) NULL,
        "cleanedByRole" character varying(20) NULL,
        "cleanedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "notes" text NULL,
        "roomId" integer,
        CONSTRAINT "PK_room_cleaning_log" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "room_cleaning_log"
      ADD CONSTRAINT "FK_room_cleaning_log_room"
      FOREIGN KEY ("roomId")
      REFERENCES "room"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "room_cleaning_log" DROP CONSTRAINT "FK_room_cleaning_log_room"`
    );
    await queryRunner.query(`DROP TABLE "room_cleaning_log"`);
    await queryRunner.query(`ALTER TABLE "room" DROP COLUMN "lastCleanedBy"`);
    await queryRunner.query(`ALTER TABLE "room" DROP COLUMN "lastCleanedAt"`);
  }
}




