// src/migrations/1763000000000-AddAuditFieldsAndLogTables.ts
import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Міграція додає:
 * 1. Поля audit до таблиці stay: createdBy, updatedBy, updatedByRole
 * 2. Таблицю stay_status_log для логування змін статусів Stay
 * 3. Таблицю room_status_log для логування змін статусів Room
 */
export class AddAuditFieldsAndLogTables1763000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Додаємо поля audit до таблиці stay
    await queryRunner.query(`
      ALTER TABLE "stay" 
      ADD COLUMN "createdBy" character varying(50) NULL,
      ADD COLUMN "updatedBy" character varying(50) NULL,
      ADD COLUMN "updatedByRole" character varying(20) NULL
    `);

    // 2. Створюємо таблицю stay_status_log
    await queryRunner.query(`
      CREATE TABLE "stay_status_log" (
        "id" SERIAL NOT NULL,
        "oldStatus" character varying(20) NOT NULL,
        "newStatus" character varying(20) NOT NULL,
        "changedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "changedBy" character varying(50) NULL,
        "changedByRole" character varying(20) NULL,
        "stayId" integer,
        CONSTRAINT "PK_stay_status_log" PRIMARY KEY ("id")
      )
    `);

    // 3. Додаємо foreign key для stay_status_log
    await queryRunner.query(`
      ALTER TABLE "stay_status_log" 
      ADD CONSTRAINT "FK_stay_status_log_stay" 
      FOREIGN KEY ("stayId") 
      REFERENCES "stay"("id") 
      ON DELETE CASCADE 
      ON UPDATE NO ACTION
    `);

    // 4. Створюємо таблицю room_status_log
    await queryRunner.query(`
      CREATE TABLE "room_status_log" (
        "id" SERIAL NOT NULL,
        "oldStatus" character varying(20) NOT NULL,
        "newStatus" character varying(20) NOT NULL,
        "changedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "changedBy" character varying(50) NULL,
        "changedByRole" character varying(20) NULL,
        "roomId" integer,
        "stayId" integer NULL,
        CONSTRAINT "PK_room_status_log" PRIMARY KEY ("id")
      )
    `);

    // 5. Додаємо foreign keys для room_status_log
    await queryRunner.query(`
      ALTER TABLE "room_status_log" 
      ADD CONSTRAINT "FK_room_status_log_room" 
      FOREIGN KEY ("roomId") 
      REFERENCES "room"("id") 
      ON DELETE CASCADE 
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "room_status_log" 
      ADD CONSTRAINT "FK_room_status_log_stay" 
      FOREIGN KEY ("stayId") 
      REFERENCES "stay"("id") 
      ON DELETE SET NULL 
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Видаляємо foreign keys
    await queryRunner.query(`
      ALTER TABLE "room_status_log" 
      DROP CONSTRAINT "FK_room_status_log_stay"
    `);

    await queryRunner.query(`
      ALTER TABLE "room_status_log" 
      DROP CONSTRAINT "FK_room_status_log_room"
    `);

    await queryRunner.query(`
      ALTER TABLE "stay_status_log" 
      DROP CONSTRAINT "FK_stay_status_log_stay"
    `);

    // Видаляємо таблиці
    await queryRunner.query(`DROP TABLE "room_status_log"`);
    await queryRunner.query(`DROP TABLE "stay_status_log"`);

    // Видаляємо поля audit з таблиці stay
    await queryRunner.query(`
      ALTER TABLE "stay" 
      DROP COLUMN "updatedByRole",
      DROP COLUMN "updatedBy",
      DROP COLUMN "createdBy"
    `);
  }
}



