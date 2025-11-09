import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStayGuests1763002004000 implements MigrationInterface {
  name = "CreateStayGuests1763002004000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "stay_guest" (
        "id" SERIAL NOT NULL,
        "fullName" character varying(150) NOT NULL,
        "documentType" character varying(50),
        "documentNumber" character varying(120),
        "birthDate" date,
        "notes" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "stayId" integer NOT NULL,
        CONSTRAINT "PK_stay_guest_id" PRIMARY KEY ("id")
      )`
    );
    await queryRunner.query(
      `ALTER TABLE "stay_guest"
        ADD CONSTRAINT "FK_stay_guest_stay"
        FOREIGN KEY ("stayId") REFERENCES "stay"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stay_guest" DROP CONSTRAINT "FK_stay_guest_stay"`
    );
    await queryRunner.query(`DROP TABLE "stay_guest"`);
  }
}



