import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1754930036124 implements MigrationInterface {
    name = 'InitSchema1754930036124'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."admin_role_enum" AS ENUM('superadmin', 'admin', 'editor')`);
        await queryRunner.query(`CREATE TABLE "admin" ("id" SERIAL NOT NULL, "username" character varying NOT NULL, "password" character varying NOT NULL, "role" "public"."admin_role_enum" NOT NULL DEFAULT 'admin', "hotel_name" character varying, "address" character varying, "full_name" character varying, "logo_url" character varying, "phone" character varying, "email" character varying, "isBlocked" boolean NOT NULL DEFAULT false, "createdById" integer, CONSTRAINT "UQ_5e568e001f9d1b91f67815c580f" UNIQUE ("username"), CONSTRAINT "PK_e032310bcef831fb83101899b10" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "room" ("id" SERIAL NOT NULL, "roomNumber" character varying NOT NULL, "floor" integer NOT NULL, "capacity" integer NOT NULL, "wifiName" character varying, "wifiPassword" character varying, "qrBarUrl" character varying, "mapPosition" character varying, "status" character varying NOT NULL DEFAULT 'free', "adminId" integer, CONSTRAINT "UQ_5f394ba13302b7ddca879251245" UNIQUE ("roomNumber"), CONSTRAINT "PK_c6d46db005d623e691b2fbcba23" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "stay" ("id" SERIAL NOT NULL, "mainGuestName" character varying NOT NULL, "extraGuestNames" text array, "checkIn" date NOT NULL, "checkOut" date NOT NULL, "balance" numeric NOT NULL DEFAULT '0', "status" character varying NOT NULL DEFAULT 'booked', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "roomId" integer, CONSTRAINT "PK_2e2903841ab4eb3c69a0a8bf77d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "admin" ADD CONSTRAINT "FK_451e60dbb932859a5df0206a542" FOREIGN KEY ("createdById") REFERENCES "admin"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "room" ADD CONSTRAINT "FK_6470fafdee8d56ecebee00d13f3" FOREIGN KEY ("adminId") REFERENCES "admin"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stay" ADD CONSTRAINT "FK_c1c93fb7da61fd37180be4d797d" FOREIGN KEY ("roomId") REFERENCES "room"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "stay" DROP CONSTRAINT "FK_c1c93fb7da61fd37180be4d797d"`);
        await queryRunner.query(`ALTER TABLE "room" DROP CONSTRAINT "FK_6470fafdee8d56ecebee00d13f3"`);
        await queryRunner.query(`ALTER TABLE "admin" DROP CONSTRAINT "FK_451e60dbb932859a5df0206a542"`);
        await queryRunner.query(`DROP TABLE "stay"`);
        await queryRunner.query(`DROP TABLE "room"`);
        await queryRunner.query(`DROP TABLE "admin"`);
        await queryRunner.query(`DROP TYPE "public"."admin_role_enum"`);
    }

}
