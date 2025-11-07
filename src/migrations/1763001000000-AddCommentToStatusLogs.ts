import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCommentToStatusLogs1763001000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stay_status_log" ADD COLUMN IF NOT EXISTS "comment" text NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "room_status_log" ADD COLUMN IF NOT EXISTS "comment" text NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "room_status_log" DROP COLUMN IF EXISTS "comment"`
    );
    await queryRunner.query(
      `ALTER TABLE "stay_status_log" DROP COLUMN IF EXISTS "comment"`
    );
  }
}
