// src/migrations/1762108621642-UpdateAddressToDetailedFields.ts
import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Миграция заменяет простое поле address на детальную структуру адреса:
 * - street (улица)
 * - buildingNumber (номер здания)
 * - apartmentNumber (номер помещения, опционально)
 * - province (провинция)
 * - postalCode (почтовый индекс)
 * - latitude (широта для карты)
 * - longitude (долгота для карты)
 */
export class UpdateAddressToDetailedFields1762108621642
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Добавляем новые поля для детального адреса
    await queryRunner.query(
      `ALTER TABLE "admin" ADD COLUMN "street" character varying(255) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "admin" ADD COLUMN "buildingNumber" character varying(50) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "admin" ADD COLUMN "apartmentNumber" character varying(50) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "admin" ADD COLUMN "province" character varying(255) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "admin" ADD COLUMN "postalCode" character varying(20) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "admin" ADD COLUMN "latitude" decimal(10,7) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "admin" ADD COLUMN "longitude" decimal(10,7) NULL`
    );

    // Удаляем старое поле address (после того как новые поля добавлены)
    await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "address"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Возвращаем старое поле address
    await queryRunner.query(
      `ALTER TABLE "admin" ADD COLUMN "address" character varying NULL`
    );

    // Удаляем новые поля детального адреса
    await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "longitude"`);
    await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "latitude"`);
    await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "postalCode"`);
    await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "province"`);
    await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "apartmentNumber"`);
    await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "buildingNumber"`);
    await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "street"`);
  }
}

