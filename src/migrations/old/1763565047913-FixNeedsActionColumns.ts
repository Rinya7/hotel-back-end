import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Міграція для виправлення needsAction полів та видалення needs_action з enum.
 * 
 * Проблеми:
 * 1. Колонки needsAction та needsActionReason не створилися попередньою міграцією
 * 2. В enum статусів є зайве значення "needs_action", яке потрібно видалити
 * 
 * Рішення:
 * 1. Додаємо колонки needsAction та needsActionReason (якщо не існують)
 * 2. Видаляємо "needs_action" з enum stay_status_enum
 * 3. Оновлюємо всі stays з status="needs_action" на status="booked" (або інший валідний статус)
 */
export class FixNeedsActionColumns1763565047913 implements MigrationInterface {
  name = "FixNeedsActionColumns1763565047913";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Перевіряємо та додаємо колонку needsAction (якщо не існує)
    const needsActionExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'stay' AND column_name = 'needsAction'
    `);

    if (needsActionExists.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "stay" ADD COLUMN "needsAction" boolean NOT NULL DEFAULT false`
      );
      console.log("[Migration] Added needsAction column");
    } else {
      console.log("[Migration] needsAction column already exists");
    }

    // 2. Перевіряємо та додаємо колонку needsActionReason (якщо не існує)
    const needsActionReasonExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'stay' AND column_name = 'needsActionReason'
    `);

    if (needsActionReasonExists.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "stay" ADD COLUMN "needsActionReason" character varying(50)`
      );
      console.log("[Migration] Added needsActionReason column");
    } else {
      console.log("[Migration] needsActionReason column already exists");
    }

    // 3. Перевіряємо, чи є "needs_action" в enum
    const enumValues = await queryRunner.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'stay_status_enum'
      )
    `);

    const hasNeedsAction = enumValues.some(
      (row: { enumlabel: string }) => row.enumlabel === "needs_action"
    );

    if (hasNeedsAction) {
      // 3.1. Оновлюємо всі stays з status="needs_action" на status="booked"
      // (або можна залишити як є, якщо немає таких записів)
      const needsActionStays = await queryRunner.query(`
        SELECT id FROM "stay" WHERE status = 'needs_action'
      `);

      if (needsActionStays.length > 0) {
        await queryRunner.query(`
          UPDATE "stay" 
          SET status = 'booked' 
          WHERE status = 'needs_action'
        `);
        console.log(
          `[Migration] Updated ${needsActionStays.length} stays from needs_action to booked`
        );
      }

      // 3.2. Видаляємо "needs_action" з enum
      // У PostgreSQL не можна просто видалити значення з enum
      // Потрібно створити новий enum без needs_action та замінити старий
      await queryRunner.query(`
        -- Зберігаємо поточне DEFAULT значення
        DO $$
        DECLARE
          default_value text;
        BEGIN
          SELECT column_default INTO default_value
          FROM information_schema.columns
          WHERE table_name = 'stay' AND column_name = 'status';
          
          -- Видаляємо DEFAULT
          ALTER TABLE "stay" ALTER COLUMN "status" DROP DEFAULT;
        END $$;
      `);

      await queryRunner.query(`
        -- Створюємо новий enum без needs_action
        CREATE TYPE "stay_status_enum_new" AS ENUM('booked', 'occupied', 'completed', 'cancelled');
      `);

      await queryRunner.query(`
        -- Оновлюємо колонку на новий enum
        ALTER TABLE "stay" 
        ALTER COLUMN "status" TYPE "stay_status_enum_new" 
        USING CASE 
          WHEN "status"::text = 'needs_action' THEN 'booked'::stay_status_enum_new
          ELSE "status"::text::stay_status_enum_new
        END;
      `);

      await queryRunner.query(`
        -- Встановлюємо DEFAULT знову
        ALTER TABLE "stay" ALTER COLUMN "status" SET DEFAULT 'booked'::stay_status_enum_new;
      `);

      await queryRunner.query(`
        -- Видаляємо старий enum
        DROP TYPE "stay_status_enum";
      `);

      await queryRunner.query(`
        -- Перейменовуємо новий enum
        ALTER TYPE "stay_status_enum_new" RENAME TO "stay_status_enum";
      `);
      console.log("[Migration] Removed needs_action from stay_status_enum");
    } else {
      console.log("[Migration] needs_action not found in enum, skipping removal");
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Відкат: видаляємо колонки (якщо існують)
    const needsActionExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'stay' AND column_name = 'needsActionReason'
    `);

    if (needsActionExists.length > 0) {
      await queryRunner.query(`ALTER TABLE "stay" DROP COLUMN "needsActionReason"`);
    }

    const needsActionReasonExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'stay' AND column_name = 'needsAction'
    `);

    if (needsActionReasonExists.length > 0) {
      await queryRunner.query(`ALTER TABLE "stay" DROP COLUMN "needsAction"`);
    }

    // Примітка: не відкатуємо видалення needs_action з enum, бо це складніше
  }
}
