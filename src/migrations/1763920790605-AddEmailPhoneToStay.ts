import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Міграція для додавання полів email та phone до таблиці stay.
 * 
 * Ці поля використовуються для:
 * - email: відправка посилання на бронювання клієнту
 * - phone: майбутня відправка посилання через WhatsApp
 */
export class AddEmailPhoneToStay1763920790605 implements MigrationInterface {
  name = "AddEmailPhoneToStay1763920790605";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Перевіряємо, чи існує колонка email
    const emailExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'stay' AND column_name = 'email'
    `);

    if (emailExists.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "stay" ADD COLUMN "email" character varying(255)`
      );
      console.log("[Migration] Added email column");
    } else {
      console.log("[Migration] email column already exists");
    }

    // Перевіряємо, чи існує колонка phone
    const phoneExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'stay' AND column_name = 'phone'
    `);

    if (phoneExists.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "stay" ADD COLUMN "phone" character varying(50)`
      );
      console.log("[Migration] Added phone column");
    } else {
      console.log("[Migration] phone column already exists");
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "stay" DROP COLUMN "phone"`);
    await queryRunner.query(`ALTER TABLE "stay" DROP COLUMN "email"`);
  }
}

