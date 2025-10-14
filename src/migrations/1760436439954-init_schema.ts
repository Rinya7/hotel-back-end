import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1760436439954 implements MigrationInterface {
    name = 'InitSchema1760436439954'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admin" DROP CONSTRAINT "CHK_admin_checkin_0_23"`);
        await queryRunner.query(`ALTER TABLE "admin" DROP CONSTRAINT "CHK_admin_checkout_0_23"`);
        await queryRunner.query(`ALTER TABLE "room" DROP CONSTRAINT "CHK_room_checkin_0_23"`);
        await queryRunner.query(`ALTER TABLE "room" DROP CONSTRAINT "CHK_room_checkout_0_23"`);
        await queryRunner.query(`ALTER TABLE "room" DROP CONSTRAINT "UQ_room_admin_roomNumber"`);
        await queryRunner.query(`ALTER TABLE "room" DROP CONSTRAINT "UQ_room_admin_roomnumber"`);
        await queryRunner.query(`ALTER TABLE "admin" ADD "defaultWifiName" character varying(255) DEFAULT 'wifi_name'`);
        await queryRunner.query(`ALTER TABLE "admin" ADD "defaultWifiPassword" character varying(255) DEFAULT 'admin'`);
        await queryRunner.query(`ALTER TABLE "stay" ALTER COLUMN "balance" TYPE numeric(10,2)`);
        await queryRunner.query(`ALTER TABLE "stay" DROP COLUMN "status"`);
        await queryRunner.query(`CREATE TYPE "public"."stay_status_enum" AS ENUM('booked', 'occupied', 'completed', 'cancelled')`);
        await queryRunner.query(`ALTER TABLE "stay" ADD "status" "public"."stay_status_enum" NOT NULL DEFAULT 'booked'`);
        await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "full_name"`);
        await queryRunner.query(`ALTER TABLE "admin" ADD "full_name" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "logo_url"`);
        await queryRunner.query(`ALTER TABLE "admin" ADD "logo_url" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "phone"`);
        await queryRunner.query(`ALTER TABLE "admin" ADD "phone" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "email"`);
        await queryRunner.query(`ALTER TABLE "admin" ADD "email" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "admin" ALTER COLUMN "checkInHour" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "admin" ALTER COLUMN "checkOutHour" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "room" DROP COLUMN "wifiName"`);
        await queryRunner.query(`ALTER TABLE "room" ADD "wifiName" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "room" DROP COLUMN "wifiPassword"`);
        await queryRunner.query(`ALTER TABLE "room" ADD "wifiPassword" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "room" DROP COLUMN "qrBarUrl"`);
        await queryRunner.query(`ALTER TABLE "room" ADD "qrBarUrl" text`);
        await queryRunner.query(`ALTER TABLE "room" DROP COLUMN "mapPosition"`);
        await queryRunner.query(`ALTER TABLE "room" ADD "mapPosition" text`);
        await queryRunner.query(`ALTER TABLE "room" DROP COLUMN "status"`);
        await queryRunner.query(`CREATE TYPE "public"."room_status_enum" AS ENUM('free', 'booked', 'occupied')`);
        await queryRunner.query(`ALTER TABLE "room" ADD "status" "public"."room_status_enum" NOT NULL DEFAULT 'free'`);
        await queryRunner.query(`ALTER TABLE "admin" ADD CONSTRAINT "CHK_249c3d804d307c17976e5a5265" CHECK ("checkOutHour" >= 0 AND "checkOutHour" <= 23)`);
        await queryRunner.query(`ALTER TABLE "admin" ADD CONSTRAINT "CHK_46863dfba2768bee1615e6f32d" CHECK ("checkInHour" >= 0 AND "checkInHour" <= 23)`);
        await queryRunner.query(`ALTER TABLE "room" ADD CONSTRAINT "CHK_dda0b64478e63fac0a0a39e269" CHECK ("checkOutHour" IS NULL OR ("checkOutHour" BETWEEN 0 AND 23))`);
        await queryRunner.query(`ALTER TABLE "room" ADD CONSTRAINT "CHK_1894b1f339b084009c0ff08ce0" CHECK ("checkInHour" IS NULL OR ("checkInHour" BETWEEN 0 AND 23))`);
        await queryRunner.query(`ALTER TABLE "room" ADD CONSTRAINT "UQ_f2c39bc46c66ac62b46f2b44103" UNIQUE ("adminId", "roomNumber")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "room" DROP CONSTRAINT "UQ_f2c39bc46c66ac62b46f2b44103"`);
        await queryRunner.query(`ALTER TABLE "room" DROP CONSTRAINT "CHK_1894b1f339b084009c0ff08ce0"`);
        await queryRunner.query(`ALTER TABLE "room" DROP CONSTRAINT "CHK_dda0b64478e63fac0a0a39e269"`);
        await queryRunner.query(`ALTER TABLE "admin" DROP CONSTRAINT "CHK_46863dfba2768bee1615e6f32d"`);
        await queryRunner.query(`ALTER TABLE "admin" DROP CONSTRAINT "CHK_249c3d804d307c17976e5a5265"`);
        await queryRunner.query(`ALTER TABLE "room" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."room_status_enum"`);
        await queryRunner.query(`ALTER TABLE "room" ADD "status" character varying NOT NULL DEFAULT 'free'`);
        await queryRunner.query(`ALTER TABLE "room" DROP COLUMN "mapPosition"`);
        await queryRunner.query(`ALTER TABLE "room" ADD "mapPosition" character varying`);
        await queryRunner.query(`ALTER TABLE "room" DROP COLUMN "qrBarUrl"`);
        await queryRunner.query(`ALTER TABLE "room" ADD "qrBarUrl" character varying`);
        await queryRunner.query(`ALTER TABLE "room" DROP COLUMN "wifiPassword"`);
        await queryRunner.query(`ALTER TABLE "room" ADD "wifiPassword" character varying`);
        await queryRunner.query(`ALTER TABLE "room" DROP COLUMN "wifiName"`);
        await queryRunner.query(`ALTER TABLE "room" ADD "wifiName" character varying`);
        await queryRunner.query(`ALTER TABLE "admin" ALTER COLUMN "checkOutHour" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "admin" ALTER COLUMN "checkInHour" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "email"`);
        await queryRunner.query(`ALTER TABLE "admin" ADD "email" character varying`);
        await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "phone"`);
        await queryRunner.query(`ALTER TABLE "admin" ADD "phone" character varying`);
        await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "logo_url"`);
        await queryRunner.query(`ALTER TABLE "admin" ADD "logo_url" character varying`);
        await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "full_name"`);
        await queryRunner.query(`ALTER TABLE "admin" ADD "full_name" character varying`);
        await queryRunner.query(`ALTER TABLE "stay" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."stay_status_enum"`);
        await queryRunner.query(`ALTER TABLE "stay" ADD "status" character varying NOT NULL DEFAULT 'booked'`);
        await queryRunner.query(`ALTER TABLE "stay" ALTER COLUMN "balance" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "defaultWifiPassword"`);
        await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "defaultWifiName"`);
        await queryRunner.query(`ALTER TABLE "room" ADD CONSTRAINT "UQ_room_admin_roomnumber" UNIQUE ("adminId", "roomNumber")`);
        await queryRunner.query(`ALTER TABLE "room" ADD CONSTRAINT "UQ_room_admin_roomNumber" UNIQUE ("adminId", "roomNumber")`);
        await queryRunner.query(`ALTER TABLE "room" ADD CONSTRAINT "CHK_room_checkout_0_23" CHECK ((("checkOutHour" IS NULL) OR (("checkOutHour" >= 0) AND ("checkOutHour" <= 23))))`);
        await queryRunner.query(`ALTER TABLE "room" ADD CONSTRAINT "CHK_room_checkin_0_23" CHECK ((("checkInHour" IS NULL) OR (("checkInHour" >= 0) AND ("checkInHour" <= 23))))`);
        await queryRunner.query(`ALTER TABLE "admin" ADD CONSTRAINT "CHK_admin_checkout_0_23" CHECK ((("checkOutHour" >= 0) AND ("checkOutHour" <= 23)))`);
        await queryRunner.query(`ALTER TABLE "admin" ADD CONSTRAINT "CHK_admin_checkin_0_23" CHECK ((("checkInHour" >= 0) AND ("checkInHour" <= 23)))`);
    }

}
