import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Міграція для додавання полів needsAction та needsActionReason до Stay entity.
 * Ці поля використовуються для відстеження просрочених check-in та check-out
 * без зміни основного статусу Stay.
 */
export class AddNeedsActionToStay1763562801305 implements MigrationInterface {
  name = "AddNeedsActionToStay1763562801305";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Додаємо поле needsAction (boolean, default: false)
    await queryRunner.query(
      `ALTER TABLE "stay" ADD COLUMN "needsAction" boolean NOT NULL DEFAULT false`
    );

    // Додаємо поле needsActionReason (varchar, nullable)
    // Може бути: "missed_checkin" | "missed_checkout" | null
    await queryRunner.query(
      `ALTER TABLE "stay" ADD COLUMN "needsActionReason" character varying(50)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Видаляємо поля при відкаті міграції
    await queryRunner.query(`ALTER TABLE "stay" DROP COLUMN "needsActionReason"`);
    await queryRunner.query(`ALTER TABLE "stay" DROP COLUMN "needsAction"`);
  }
}
