import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Міграція для оновлення полів Stay та StayGuest:
 * - Додає firstName, lastName, guestsCount до Stay
 * - Замінює fullName на firstName/lastName в StayGuest (якщо fullName існує)
 * 
 * Ці поля використовуються для:
 * - firstName/lastName: розділення імені та прізвища для кращої обробки даних
 * - guestsCount: кількість гостей для майбутнього заселення
 * - email/phone: контактна інформація гостя
 */
export class UpdateStayAndStayGuestFields1763931857574
  implements MigrationInterface
{
  name = "UpdateStayAndStayGuestFields1763931857574";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========== STAY TABLE ==========
    
    // Додаємо firstName до Stay
    const stayFirstNameExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'stay' AND column_name = 'firstName'
    `);

    if (stayFirstNameExists.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "stay" ADD COLUMN "firstName" character varying(100)`
      );
      console.log("[Migration] Added firstName column to stay");
    } else {
      console.log("[Migration] firstName column already exists in stay");
    }

    // Додаємо lastName до Stay
    const stayLastNameExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'stay' AND column_name = 'lastName'
    `);

    if (stayLastNameExists.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "stay" ADD COLUMN "lastName" character varying(100)`
      );
      console.log("[Migration] Added lastName column to stay");
    } else {
      console.log("[Migration] lastName column already exists in stay");
    }

    // Додаємо guestsCount до Stay
    const stayGuestsCountExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'stay' AND column_name = 'guestsCount'
    `);

    if (stayGuestsCountExists.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "stay" ADD COLUMN "guestsCount" integer DEFAULT 1`
      );
      console.log("[Migration] Added guestsCount column to stay");
    } else {
      console.log("[Migration] guestsCount column already exists in stay");
    }

    // Замінюємо phone на phoneCountryCode та phoneNumber в Stay
    const stayPhoneExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'stay' AND column_name = 'phone'
    `);

    if (stayPhoneExists.length > 0) {
      // Додаємо нові колонки
      const stayPhoneCountryCodeExists = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'stay' AND column_name = 'phoneCountryCode'
      `);
      
      if (stayPhoneCountryCodeExists.length === 0) {
        await queryRunner.query(
          `ALTER TABLE "stay" ADD COLUMN "phoneCountryCode" character varying(10)`
        );
        console.log("[Migration] Added phoneCountryCode column to stay");
      }

      const stayPhoneNumberExists = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'stay' AND column_name = 'phoneNumber'
      `);
      
      if (stayPhoneNumberExists.length === 0) {
        await queryRunner.query(
          `ALTER TABLE "stay" ADD COLUMN "phoneNumber" character varying(50)`
        );
        console.log("[Migration] Added phoneNumber column to stay");
      }

      // Мігруємо дані з phone в phoneCountryCode та phoneNumber
      await queryRunner.query(`
        UPDATE "stay"
        SET 
          "phoneCountryCode" = CASE 
            WHEN "phone" ~ '^\\+\\d{1,4}\\s' 
            THEN SUBSTRING("phone" FROM '^(\\+\\d{1,4})')
            ELSE NULL
          END,
          "phoneNumber" = CASE 
            WHEN "phone" ~ '^\\+\\d{1,4}\\s' 
            THEN TRIM(SUBSTRING("phone" FROM '^\\+\\d{1,4}\\s+(.+)$'))
            WHEN "phone" IS NOT NULL AND "phone" != ''
            THEN "phone"
            ELSE NULL
          END
        WHERE "phone" IS NOT NULL AND "phone" != ''
      `);
      console.log("[Migration] Migrated phone data to phoneCountryCode/phoneNumber in stay");

      // Видаляємо стару колонку phone
      await queryRunner.query(
        `ALTER TABLE "stay" DROP COLUMN IF EXISTS "phone"`
      );
      console.log("[Migration] Removed phone column from stay");
    } else {
      // Якщо phone не існує, просто додаємо нові колонки
      const stayPhoneCountryCodeExists = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'stay' AND column_name = 'phoneCountryCode'
      `);
      
      if (stayPhoneCountryCodeExists.length === 0) {
        await queryRunner.query(
          `ALTER TABLE "stay" ADD COLUMN "phoneCountryCode" character varying(10)`
        );
        console.log("[Migration] Added phoneCountryCode column to stay");
      }

      const stayPhoneNumberExists = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'stay' AND column_name = 'phoneNumber'
      `);
      
      if (stayPhoneNumberExists.length === 0) {
        await queryRunner.query(
          `ALTER TABLE "stay" ADD COLUMN "phoneNumber" character varying(50)`
        );
        console.log("[Migration] Added phoneNumber column to stay");
      }
    }

    // ========== STAY_GUEST TABLE ==========
    
    // Перевіряємо, чи існує fullName
    const fullNameExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'stay_guest' AND column_name = 'fullName'
    `);

    // Якщо fullName існує, але firstName/lastName не існують - потрібно мігрувати дані
    // Але оскільки ми вже додали firstName/lastName в попередній міграції,
    // просто видаляємо fullName, якщо він існує
    if (fullNameExists.length > 0) {
      // Перевіряємо, чи є дані в fullName, які потрібно зберегти
      const hasData = await queryRunner.query(`
        SELECT COUNT(*) as count 
        FROM "stay_guest" 
        WHERE "fullName" IS NOT NULL AND "fullName" != ''
      `);

      if (hasData[0]?.count > 0) {
        // Якщо є дані, але firstName/lastName порожні - намагаємося розділити fullName
        await queryRunner.query(`
          UPDATE "stay_guest"
          SET 
            "firstName" = CASE 
              WHEN "firstName" IS NULL OR "firstName" = '' 
              THEN SPLIT_PART("fullName", ' ', 1)
              ELSE "firstName"
            END,
            "lastName" = CASE 
              WHEN "lastName" IS NULL OR "lastName" = ''
              THEN COALESCE(
                NULLIF(TRIM(SUBSTRING("fullName" FROM POSITION(' ' IN "fullName") + 1)), ''),
                SPLIT_PART("fullName", ' ', 1)
              )
              ELSE "lastName"
            END
          WHERE "fullName" IS NOT NULL AND "fullName" != ''
        `);
        console.log("[Migration] Migrated fullName data to firstName/lastName");
      }

      // Видаляємо колонку fullName
      await queryRunner.query(
        `ALTER TABLE "stay_guest" DROP COLUMN IF EXISTS "fullName"`
      );
      console.log("[Migration] Removed fullName column from stay_guest");
    } else {
      console.log("[Migration] fullName column does not exist in stay_guest");
    }

    // Замінюємо phone на phoneCountryCode та phoneNumber в StayGuest
    const stayGuestPhoneExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'stay_guest' AND column_name = 'phone'
    `);

    if (stayGuestPhoneExists.length > 0) {
      // Додаємо нові колонки
      const stayGuestPhoneCountryCodeExists = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'stay_guest' AND column_name = 'phoneCountryCode'
      `);
      
      if (stayGuestPhoneCountryCodeExists.length === 0) {
        await queryRunner.query(
          `ALTER TABLE "stay_guest" ADD COLUMN "phoneCountryCode" character varying(10)`
        );
        console.log("[Migration] Added phoneCountryCode column to stay_guest");
      }

      const stayGuestPhoneNumberExists = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'stay_guest' AND column_name = 'phoneNumber'
      `);
      
      if (stayGuestPhoneNumberExists.length === 0) {
        await queryRunner.query(
          `ALTER TABLE "stay_guest" ADD COLUMN "phoneNumber" character varying(50)`
        );
        console.log("[Migration] Added phoneNumber column to stay_guest");
      }

      // Мігруємо дані з phone в phoneCountryCode та phoneNumber
      await queryRunner.query(`
        UPDATE "stay_guest"
        SET 
          "phoneCountryCode" = CASE 
            WHEN "phone" ~ '^\\+\\d{1,4}\\s' 
            THEN SUBSTRING("phone" FROM '^(\\+\\d{1,4})')
            ELSE NULL
          END,
          "phoneNumber" = CASE 
            WHEN "phone" ~ '^\\+\\d{1,4}\\s' 
            THEN TRIM(SUBSTRING("phone" FROM '^\\+\\d{1,4}\\s+(.+)$'))
            WHEN "phone" IS NOT NULL AND "phone" != ''
            THEN "phone"
            ELSE NULL
          END
        WHERE "phone" IS NOT NULL AND "phone" != ''
      `);
      console.log("[Migration] Migrated phone data to phoneCountryCode/phoneNumber in stay_guest");

      // Видаляємо стару колонку phone
      await queryRunner.query(
        `ALTER TABLE "stay_guest" DROP COLUMN IF EXISTS "phone"`
      );
      console.log("[Migration] Removed phone column from stay_guest");
    } else {
      // Якщо phone не існує, просто додаємо нові колонки
      const stayGuestPhoneCountryCodeExists = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'stay_guest' AND column_name = 'phoneCountryCode'
      `);
      
      if (stayGuestPhoneCountryCodeExists.length === 0) {
        await queryRunner.query(
          `ALTER TABLE "stay_guest" ADD COLUMN "phoneCountryCode" character varying(10)`
        );
        console.log("[Migration] Added phoneCountryCode column to stay_guest");
      }

      const stayGuestPhoneNumberExists = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'stay_guest' AND column_name = 'phoneNumber'
      `);
      
      if (stayGuestPhoneNumberExists.length === 0) {
        await queryRunner.query(
          `ALTER TABLE "stay_guest" ADD COLUMN "phoneNumber" character varying(50)`
        );
        console.log("[Migration] Added phoneNumber column to stay_guest");
      }
    }

    // Переконаємося, що firstName та lastName є NOT NULL (якщо потрібно)
    // Але оскільки вони можуть бути nullable для сумісності, залишаємо як є
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Відкат: додаємо fullName назад
    const fullNameExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'stay_guest' AND column_name = 'fullName'
    `);

    if (fullNameExists.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "stay_guest" ADD COLUMN "fullName" character varying(150)`
      );

      // Об'єднуємо firstName та lastName назад в fullName
      await queryRunner.query(`
        UPDATE "stay_guest"
        SET "fullName" = TRIM(
          COALESCE("firstName", '') || ' ' || COALESCE("lastName", '')
        )
        WHERE "firstName" IS NOT NULL OR "lastName" IS NOT NULL
      `);
    }

    // Відкат: відновлюємо phone з phoneCountryCode та phoneNumber
    const stayPhoneExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'stay' AND column_name = 'phone'
    `);

    if (stayPhoneExists.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "stay" ADD COLUMN "phone" character varying(50)`
      );

      // Об'єднуємо phoneCountryCode та phoneNumber назад в phone
      await queryRunner.query(`
        UPDATE "stay"
        SET "phone" = TRIM(
          COALESCE("phoneCountryCode", '') || ' ' || COALESCE("phoneNumber", '')
        )
        WHERE ("phoneCountryCode" IS NOT NULL OR "phoneNumber" IS NOT NULL)
      `);
    }

    await queryRunner.query(
      `ALTER TABLE "stay" DROP COLUMN IF EXISTS "phoneNumber"`
    );
    await queryRunner.query(
      `ALTER TABLE "stay" DROP COLUMN IF EXISTS "phoneCountryCode"`
    );
    await queryRunner.query(
      `ALTER TABLE "stay" DROP COLUMN IF EXISTS "guestsCount"`
    );
    await queryRunner.query(
      `ALTER TABLE "stay" DROP COLUMN IF EXISTS "lastName"`
    );
    await queryRunner.query(
      `ALTER TABLE "stay" DROP COLUMN IF EXISTS "firstName"`
    );

    // Відкат для StayGuest
    const stayGuestPhoneExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'stay_guest' AND column_name = 'phone'
    `);

    if (stayGuestPhoneExists.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "stay_guest" ADD COLUMN "phone" character varying(50)`
      );

      // Об'єднуємо phoneCountryCode та phoneNumber назад в phone
      await queryRunner.query(`
        UPDATE "stay_guest"
        SET "phone" = TRIM(
          COALESCE("phoneCountryCode", '') || ' ' || COALESCE("phoneNumber", '')
        )
        WHERE ("phoneCountryCode" IS NOT NULL OR "phoneNumber" IS NOT NULL)
      `);
    }

    await queryRunner.query(
      `ALTER TABLE "stay_guest" DROP COLUMN IF EXISTS "phoneNumber"`
    );
    await queryRunner.query(
      `ALTER TABLE "stay_guest" DROP COLUMN IF EXISTS "phoneCountryCode"`
    );
  }
}

