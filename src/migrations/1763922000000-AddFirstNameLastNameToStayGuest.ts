import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Міграція для додавання полів firstName, lastName, email та phone до таблиці stay_guest.
 * 
 * Ці поля використовуються для розділення імені та прізвища клієнта
 * та зберігання контактної інформації для майбутньої бази клієнтів.
 */
export class AddFirstNameLastNameToStayGuest1763922000000 implements MigrationInterface {
  name = "AddFirstNameLastNameToStayGuest1763922000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Перевіряємо та додаємо firstName
    const firstNameExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'stay_guest' AND column_name = 'firstName'
    `);

    if (firstNameExists.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "stay_guest" ADD COLUMN "firstName" character varying(100)`
      );
      console.log("[Migration] Added firstName column");
    } else {
      console.log("[Migration] firstName column already exists");
    }

    // Перевіряємо та додаємо lastName
    const lastNameExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'stay_guest' AND column_name = 'lastName'
    `);

    if (lastNameExists.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "stay_guest" ADD COLUMN "lastName" character varying(100)`
      );
      console.log("[Migration] Added lastName column");
    } else {
      console.log("[Migration] lastName column already exists");
    }

    // Перевіряємо та додаємо email
    const emailExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'stay_guest' AND column_name = 'email'
    `);

    if (emailExists.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "stay_guest" ADD COLUMN "email" character varying(100)`
      );
      console.log("[Migration] Added email column");
    } else {
      console.log("[Migration] email column already exists");
    }

    // Перевіряємо та додаємо phone
    const phoneExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'stay_guest' AND column_name = 'phone'
    `);

    if (phoneExists.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "stay_guest" ADD COLUMN "phone" character varying(20)`
      );
      console.log("[Migration] Added phone column");
    } else {
      console.log("[Migration] phone column already exists");
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "stay_guest" DROP COLUMN "phone"`);
    await queryRunner.query(`ALTER TABLE "stay_guest" DROP COLUMN "email"`);
    await queryRunner.query(`ALTER TABLE "stay_guest" DROP COLUMN "lastName"`);
    await queryRunner.query(`ALTER TABLE "stay_guest" DROP COLUMN "firstName"`);
  }
}

