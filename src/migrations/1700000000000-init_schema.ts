// src/migrations/1700000000000-init_schema.ts
// FINAL CONSOLIDATED SCHEMA MIGRATION
// This migration creates the complete database schema for the Hotel PMS system.
// It replaces all previous migrations and should be used for fresh database initialization.

import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1700000000000 implements MigrationInterface {
  name = "InitSchema1700000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // STEP 1: Create ENUM types
    // ============================================
    await queryRunner.query(`
      CREATE TYPE "public"."admin_role_enum" AS ENUM('superadmin', 'admin', 'editor')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."room_status_enum" AS ENUM('free', 'occupied', 'cleaning')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."stay_status_enum" AS ENUM('booked', 'occupied', 'completed', 'cancelled')
    `);

    // ============================================
    // STEP 2: Create core tables (no dependencies)
    // ============================================

    // Admin table (users: superadmin, admin, editor)
    await queryRunner.query(`
      CREATE TABLE "admin" (
        "id" SERIAL NOT NULL,
        "username" character varying NOT NULL,
        "password" character varying NOT NULL,
        "role" "public"."admin_role_enum" NOT NULL DEFAULT 'admin',
        "hotel_name" character varying,
        "street" character varying(255),
        "buildingNumber" character varying(50),
        "apartmentNumber" character varying(50),
        "country" character varying(100),
        "province" character varying(255),
        "postalCode" character varying(20),
        "latitude" decimal(10,7),
        "longitude" decimal(10,7),
        "full_name" character varying(255),
        "logo_url" character varying(255),
        "phoneCountryCode" character varying(10),
        "phoneNumber" character varying(50),
        "email" character varying(255),
        "isBlocked" boolean NOT NULL DEFAULT false,
        "checkInHour" integer,
        "checkOutHour" integer,
        "defaultWifiName" character varying(255) DEFAULT 'wifi_name',
        "defaultWifiPassword" character varying(255) DEFAULT 'admin',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "createdById" integer,
        CONSTRAINT "UQ_5e568e001f9d1b91f67815c580f" UNIQUE ("username"),
        CONSTRAINT "PK_e032310bcef831fb83101899b10" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_admin_checkin_0_23" CHECK ("checkInHour" >= 0 AND "checkInHour" <= 23),
        CONSTRAINT "CHK_admin_checkout_0_23" CHECK ("checkOutHour" >= 0 AND "checkOutHour" <= 23)
      )
    `);

    // Self-referencing foreign key for Admin (createdBy -> Admin)
    await queryRunner.query(`
      ALTER TABLE "admin"
      ADD CONSTRAINT "FK_451e60dbb932859a5df0206a542"
      FOREIGN KEY ("createdById") REFERENCES "admin"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // ============================================
    // STEP 3: Create Room table (depends on Admin)
    // ============================================

    await queryRunner.query(`
      CREATE TABLE "room" (
        "id" SERIAL NOT NULL,
        "roomNumber" character varying NOT NULL,
        "floor" integer NOT NULL,
        "capacity" integer NOT NULL,
        "wifiName" character varying(100),
        "wifiPassword" character varying(100),
        "qrBarUrl" text,
        "mapPosition" text,
        "status" "public"."room_status_enum" NOT NULL DEFAULT 'free',
        "lastCleanedAt" TIMESTAMP,
        "lastCleanedBy" character varying(50),
        "checkInHour" integer,
        "checkOutHour" integer,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "adminId" integer,
        CONSTRAINT "PK_c6d46db005d623e691b2fbcba23" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_room_admin_roomNumber" UNIQUE ("adminId", "roomNumber"),
        CONSTRAINT "CHK_room_checkin_0_23" CHECK ("checkInHour" IS NULL OR ("checkInHour" BETWEEN 0 AND 23)),
        CONSTRAINT "CHK_room_checkout_0_23" CHECK ("checkOutHour" IS NULL OR ("checkOutHour" BETWEEN 0 AND 23))
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "room"
      ADD CONSTRAINT "FK_6470fafdee8d56ecebee00d13f3"
      FOREIGN KEY ("adminId") REFERENCES "admin"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // ============================================
    // STEP 4: Create Stay table (depends on Room)
    // ============================================

    await queryRunner.query(`
      CREATE TABLE "stay" (
        "id" SERIAL NOT NULL,
        "mainGuestName" character varying NOT NULL,
        "firstName" character varying(100),
        "lastName" character varying(100),
        "email" character varying(150),
        "phoneCountryCode" character varying(10),
        "phoneNumber" character varying(50),
        "guestsCount" integer DEFAULT 1,
        "extraGuestNames" text array DEFAULT '{}',
        "checkIn" date NOT NULL,
        "checkOut" date NOT NULL,
        "balance" numeric(10,2) NOT NULL DEFAULT '0',
        "status" "public"."stay_status_enum" NOT NULL DEFAULT 'booked',
        "needsAction" boolean NOT NULL DEFAULT false,
        "needsActionReason" character varying(50),
        "createdBy" character varying(50),
        "updatedBy" character varying(50),
        "updatedByRole" character varying(20),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "roomId" integer,
        CONSTRAINT "PK_2e2903841ab4eb3c69a0a8bf77d" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "stay"
      ADD CONSTRAINT "FK_c1c93fb7da61fd37180be4d797d"
      FOREIGN KEY ("roomId") REFERENCES "room"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // ============================================
    // STEP 5: Create StayGuest table (depends on Stay)
    // ============================================

    await queryRunner.query(`
      CREATE TABLE "stay_guest" (
        "id" SERIAL NOT NULL,
        "firstName" character varying(100) NOT NULL,
        "lastName" character varying(100) NOT NULL,
        "email" character varying(150),
        "phoneCountryCode" character varying(10),
        "phoneNumber" character varying(50),
        "documentType" character varying(50),
        "documentNumber" character varying(120),
        "birthDate" date,
        "notes" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "stayId" integer,
        CONSTRAINT "PK_stay_guest" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "stay_guest"
      ADD CONSTRAINT "FK_ee234752850dff04085c4373f52"
      FOREIGN KEY ("stayId") REFERENCES "stay"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // ============================================
    // STEP 6: Create GuestAccessToken table (depends on Stay)
    // ============================================

    await queryRunner.query(`
      CREATE TABLE "guest_access_token" (
        "id" SERIAL NOT NULL,
        "token" character varying(255) NOT NULL,
        "expiresAt" TIMESTAMP,
        "revokedAt" TIMESTAMP,
        "lastUsedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "stayId" integer,
        CONSTRAINT "UQ_680ef15bf3b608608dbbb6a0d92" UNIQUE ("token"),
        CONSTRAINT "PK_92f8ac82df65563b4748be020f5" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "guest_access_token"
      ADD CONSTRAINT "FK_f00a66cdbeaf32a0ed34412a560"
      FOREIGN KEY ("stayId") REFERENCES "stay"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // ============================================
    // STEP 7: Create StayStatusLog table (depends on Stay)
    // ============================================

    await queryRunner.query(`
      CREATE TABLE "stay_status_log" (
        "id" SERIAL NOT NULL,
        "oldStatus" character varying(20) NOT NULL,
        "newStatus" character varying(20) NOT NULL,
        "changedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "changedBy" character varying(50),
        "changedByRole" character varying(20),
        "comment" text,
        "stayId" integer,
        CONSTRAINT "PK_stay_status_log" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "stay_status_log"
      ADD CONSTRAINT "FK_cb28425e0de0422ce7c5ab398f8"
      FOREIGN KEY ("stayId") REFERENCES "stay"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // ============================================
    // STEP 8: Create RoomStatusLog table (depends on Room and Stay)
    // ============================================

    await queryRunner.query(`
      CREATE TABLE "room_status_log" (
        "id" SERIAL NOT NULL,
        "oldStatus" character varying(20) NOT NULL,
        "newStatus" character varying(20) NOT NULL,
        "changedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "changedBy" character varying(50),
        "changedByRole" character varying(20),
        "comment" text,
        "roomId" integer,
        "stayId" integer,
        CONSTRAINT "PK_room_status_log" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "room_status_log"
      ADD CONSTRAINT "FK_a628ece21d0b93a2d83ffb6fe41"
      FOREIGN KEY ("roomId") REFERENCES "room"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "room_status_log"
      ADD CONSTRAINT "FK_34bed1105755e07fe9e1d48e058"
      FOREIGN KEY ("stayId") REFERENCES "stay"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // ============================================
    // STEP 9: Create RoomCleaningLog table (depends on Room)
    // ============================================

    await queryRunner.query(`
      CREATE TABLE "room_cleaning_log" (
        "id" SERIAL NOT NULL,
        "cleanedBy" character varying(50),
        "cleanedByRole" character varying(20),
        "cleanedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "notes" text,
        "roomId" integer,
        CONSTRAINT "PK_room_cleaning_log" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "room_cleaning_log"
      ADD CONSTRAINT "FK_f23e34b65a8b7113568b47ed110"
      FOREIGN KEY ("roomId") REFERENCES "room"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order of dependencies
    await queryRunner.query(`ALTER TABLE "room_cleaning_log" DROP CONSTRAINT "FK_f23e34b65a8b7113568b47ed110"`);
    await queryRunner.query(`DROP TABLE "room_cleaning_log"`);

    await queryRunner.query(`ALTER TABLE "room_status_log" DROP CONSTRAINT "FK_34bed1105755e07fe9e1d48e058"`);
    await queryRunner.query(`ALTER TABLE "room_status_log" DROP CONSTRAINT "FK_a628ece21d0b93a2d83ffb6fe41"`);
    await queryRunner.query(`DROP TABLE "room_status_log"`);

    await queryRunner.query(`ALTER TABLE "stay_status_log" DROP CONSTRAINT "FK_cb28425e0de0422ce7c5ab398f8"`);
    await queryRunner.query(`DROP TABLE "stay_status_log"`);

    await queryRunner.query(`ALTER TABLE "guest_access_token" DROP CONSTRAINT "FK_f00a66cdbeaf32a0ed34412a560"`);
    await queryRunner.query(`DROP TABLE "guest_access_token"`);

    await queryRunner.query(`ALTER TABLE "stay_guest" DROP CONSTRAINT "FK_ee234752850dff04085c4373f52"`);
    await queryRunner.query(`DROP TABLE "stay_guest"`);

    await queryRunner.query(`ALTER TABLE "stay" DROP CONSTRAINT "FK_c1c93fb7da61fd37180be4d797d"`);
    await queryRunner.query(`DROP TABLE "stay"`);

    await queryRunner.query(`ALTER TABLE "room" DROP CONSTRAINT "FK_6470fafdee8d56ecebee00d13f3"`);
    await queryRunner.query(`DROP TABLE "room"`);

    await queryRunner.query(`ALTER TABLE "admin" DROP CONSTRAINT "FK_451e60dbb932859a5df0206a542"`);
    await queryRunner.query(`DROP TABLE "admin"`);

    // Drop ENUM types
    await queryRunner.query(`DROP TYPE "public"."stay_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."room_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."admin_role_enum"`);
  }
}








