import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1763134684826 implements MigrationInterface {
    name = 'InitSchema1763134684826'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "room_status_log" DROP CONSTRAINT IF EXISTS "FK_room_status_log_room"`);
        await queryRunner.query(`ALTER TABLE "room_status_log" DROP CONSTRAINT IF EXISTS "FK_room_status_log_stay"`);
        await queryRunner.query(`ALTER TABLE "room_cleaning_log" DROP CONSTRAINT IF EXISTS "FK_room_cleaning_log_room"`);
        await queryRunner.query(`ALTER TABLE "stay_guest" DROP CONSTRAINT IF EXISTS "FK_stay_guest_stay"`);
        await queryRunner.query(`ALTER TABLE "stay_status_log" DROP CONSTRAINT IF EXISTS "FK_stay_status_log_stay"`);
        await queryRunner.query(`ALTER TABLE "room" DROP CONSTRAINT IF EXISTS "CHK_room_wifi_start_0_23"`);
        await queryRunner.query(`ALTER TABLE "room" DROP CONSTRAINT IF EXISTS "CHK_room_wifi_end_0_23"`);
        await queryRunner.query(`CREATE TABLE "guest_access_token" ("id" SERIAL NOT NULL, "token" character varying(255) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "expiresAt" TIMESTAMP, "revokedAt" TIMESTAMP, "lastUsedAt" TIMESTAMP, "stayId" integer, CONSTRAINT "UQ_680ef15bf3b608608dbbb6a0d92" UNIQUE ("token"), CONSTRAINT "PK_92f8ac82df65563b4748be020f5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "phone"`);
        await queryRunner.query(`ALTER TABLE "room" DROP COLUMN "wifiStartHour"`);
        await queryRunner.query(`ALTER TABLE "room" DROP COLUMN "wifiEndHour"`);
        await queryRunner.query(`ALTER TABLE "room_status_log" ALTER COLUMN "changedAt" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "room_cleaning_log" ALTER COLUMN "cleanedAt" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "stay_guest" ALTER COLUMN "stayId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "stay" ALTER COLUMN "extraGuestNames" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "stay_status_log" ALTER COLUMN "changedAt" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "room_status_log" ADD CONSTRAINT "FK_a628ece21d0b93a2d83ffb6fe41" FOREIGN KEY ("roomId") REFERENCES "room"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "room_status_log" ADD CONSTRAINT "FK_34bed1105755e07fe9e1d48e058" FOREIGN KEY ("stayId") REFERENCES "stay"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "room_cleaning_log" ADD CONSTRAINT "FK_f23e34b65a8b7113568b47ed110" FOREIGN KEY ("roomId") REFERENCES "room"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stay_guest" ADD CONSTRAINT "FK_ee234752850dff04085c4373f52" FOREIGN KEY ("stayId") REFERENCES "stay"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "guest_access_token" ADD CONSTRAINT "FK_f00a66cdbeaf32a0ed34412a560" FOREIGN KEY ("stayId") REFERENCES "stay"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stay_status_log" ADD CONSTRAINT "FK_cb28425e0de0422ce7c5ab398f8" FOREIGN KEY ("stayId") REFERENCES "stay"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "stay_status_log" DROP CONSTRAINT "FK_cb28425e0de0422ce7c5ab398f8"`);
        await queryRunner.query(`ALTER TABLE "guest_access_token" DROP CONSTRAINT "FK_f00a66cdbeaf32a0ed34412a560"`);
        await queryRunner.query(`ALTER TABLE "stay_guest" DROP CONSTRAINT "FK_ee234752850dff04085c4373f52"`);
        await queryRunner.query(`ALTER TABLE "room_cleaning_log" DROP CONSTRAINT "FK_f23e34b65a8b7113568b47ed110"`);
        await queryRunner.query(`ALTER TABLE "room_status_log" DROP CONSTRAINT "FK_34bed1105755e07fe9e1d48e058"`);
        await queryRunner.query(`ALTER TABLE "room_status_log" DROP CONSTRAINT "FK_a628ece21d0b93a2d83ffb6fe41"`);
        await queryRunner.query(`ALTER TABLE "stay_status_log" ALTER COLUMN "changedAt" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "stay" ALTER COLUMN "extraGuestNames" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "stay_guest" ALTER COLUMN "stayId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "room_cleaning_log" ALTER COLUMN "cleanedAt" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "room_status_log" ALTER COLUMN "changedAt" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "room" ADD "wifiEndHour" integer`);
        await queryRunner.query(`ALTER TABLE "room" ADD "wifiStartHour" integer`);
        await queryRunner.query(`ALTER TABLE "admin" ADD "phone" character varying(255)`);
        await queryRunner.query(`DROP TABLE "guest_access_token"`);
        await queryRunner.query(`ALTER TABLE "room" ADD CONSTRAINT "CHK_room_wifi_end_0_23" CHECK ((("wifiEndHour" IS NULL) OR (("wifiEndHour" >= 0) AND ("wifiEndHour" <= 23))))`);
        await queryRunner.query(`ALTER TABLE "room" ADD CONSTRAINT "CHK_room_wifi_start_0_23" CHECK ((("wifiStartHour" IS NULL) OR (("wifiStartHour" >= 0) AND ("wifiStartHour" <= 23))))`);
        await queryRunner.query(`ALTER TABLE "stay_status_log" ADD CONSTRAINT "FK_stay_status_log_stay" FOREIGN KEY ("stayId") REFERENCES "stay"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stay_guest" ADD CONSTRAINT "FK_stay_guest_stay" FOREIGN KEY ("stayId") REFERENCES "stay"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "room_cleaning_log" ADD CONSTRAINT "FK_room_cleaning_log_room" FOREIGN KEY ("roomId") REFERENCES "room"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "room_status_log" ADD CONSTRAINT "FK_room_status_log_stay" FOREIGN KEY ("stayId") REFERENCES "stay"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "room_status_log" ADD CONSTRAINT "FK_room_status_log_room" FOREIGN KEY ("roomId") REFERENCES "room"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
