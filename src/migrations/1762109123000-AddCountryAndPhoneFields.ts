// src/migrations/1762109123000-AddCountryAndPhoneFields.ts
import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Миграция добавляет:
 * - поле country (страна)
 * - разделяет phone на phoneCountryCode и phoneNumber
 */
export class AddCountryAndPhoneFields1762109123000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Добавляем поле country
    await queryRunner.query(
      `ALTER TABLE "admin" ADD COLUMN "country" character varying(100) NULL`
    );

    // Добавляем новые поля для телефона
    await queryRunner.query(
      `ALTER TABLE "admin" ADD COLUMN "phoneCountryCode" character varying(10) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "admin" ADD COLUMN "phoneNumber" character varying(50) NULL`
    );

    // Переносим данные из старого поля phone (если есть) в новые поля
    // Попытаемся распарсить существующие номера
    // Формат может быть: +39-351-780-56-65 или +39 351 780 56 65 или +393517805665
    // Просто копируем как есть в phoneNumber, если начинается с + - то в phoneCountryCode
    await queryRunner.query(`
      UPDATE "admin"
      SET 
        "phoneCountryCode" = CASE 
          WHEN "phone" LIKE '+%' THEN SUBSTRING("phone" FROM '^\\+[0-9]{1,3}')
          ELSE NULL
        END,
        "phoneNumber" = CASE 
          WHEN "phone" LIKE '+%' THEN SUBSTRING("phone" FROM '\\+[0-9]{1,3}(.*)')
          ELSE "phone"
        END
      WHERE "phone" IS NOT NULL
    `);

    // Старое поле phone можно удалить через отдельную миграцию позже, если нужно
    // Пока оставляем для обратной совместимости
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Удаляем новые поля
    await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "phoneNumber"`);
    await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "phoneCountryCode"`);
    await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "country"`);
  }
}

