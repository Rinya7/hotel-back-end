// src/services/statusService.ts
// Purpose:
//   - Automatically promote/demote Stay & Room statuses based on policy hours.
//   - Policy precedence: Room → Admin → global defaults.
//   - Works with DATE-only columns for checkIn/checkOut by composing a local DateTime
//     with hotel policy hours (e.g., 14:00 / 10:00) in APP_TIMEZONE.
//
// Notes:
//   - Runs safely inside a transaction (called from a cron job).
//   - We avoid invalid "lock" usage on find() (TypeORM requires QueryBuilder for locks).
//   - Code is idempotent: running multiple times per minute is ok.

import { AppDataSource } from "../config/data-source";
import { Stay } from "../entities/Stay";
import { Room } from "../entities/Room";
import { Admin } from "../entities/Admin";
import {
  LessThanOrEqual,
  MoreThanOrEqual,
  MoreThan,
  In,
  EntityManager,
} from "typeorm";
import {
  APP_TIMEZONE,
  DEFAULT_CHECKIN_HOUR,
  DEFAULT_CHECKOUT_HOUR,
  CRON_TOLERANCE_SECONDS,
} from "../config/time";
import { DateTime } from "luxon";

type StayStatus = "booked" | "occupied" | "completed" | "cancelled";
type RoomStatus = "free" | "booked" | "occupied";

/** Compose a local DateTime from a DATE-only column + a given local hour. */
function makeLocalDateTime(
  dateOnly: Date,
  hour: number,
  minute = 0,
  second = 0
): DateTime {
  // DATE from DB comes as a JS Date at midnight (timezone nuances vary).
  // We read Y/M/D from UTC getters to avoid local shifts, then compose in target TZ.
  const js = new Date(dateOnly);
  const y = js.getUTCFullYear();
  const m = js.getUTCMonth() + 1;
  const d = js.getUTCDate();
  return DateTime.fromObject(
    { year: y, month: m, day: d, hour, minute, second },
    { zone: APP_TIMEZONE }
  );
}

/** Now and a small back-tolerance to avoid missing exact boundaries. */
function nowWithTolerance(): { now: DateTime; earliest: DateTime } {
  const now = DateTime.now().setZone(APP_TIMEZONE);
  const earliest = now.minus({ seconds: CRON_TOLERANCE_SECONDS });
  return { now, earliest };
}

/** Pick policy hours with priority: Room → Admin → global defaults. */
function policyHoursFor(room: Room): { inHour: number; outHour: number } {
  // 1) Per-room override (only when both hours explicitly set as integers)
  if (
    Number.isInteger(room.checkInHour) &&
    Number.isInteger(room.checkOutHour)
  ) {
    return {
      inHour: room.checkInHour as number,
      outHour: room.checkOutHour as number,
    };
  }

  // 2) Fallback to Admin (owner) policy if present in the schema
  const admin: Admin | undefined = room.admin;
  if (
    admin &&
    Number.isInteger(admin.checkInHour) &&
    Number.isInteger(admin.checkOutHour)
  ) {
    return {
      inHour: admin.checkInHour as number,
      outHour: admin.checkOutHour as number,
    };
  }

  // 3) Global defaults (safe fallback)
  return { inHour: DEFAULT_CHECKIN_HOUR, outHour: DEFAULT_CHECKOUT_HOUR };
}

export class StatusService {
  // Repositories via 'manager' inside a transaction ensure we operate within the tx.
  // No instance repositories are needed here.

  /** Cron tick: promote/demote statuses according to policy hours. */
  public async tick(): Promise<void> {
    const { now } = nowWithTolerance();

    await AppDataSource.transaction(async (manager) => {
      const todayStart = now.startOf("day");

      // === 1) BOOKED → OCCUPIED when check-in time has arrived ===
      // Prefilter by day (DATE-only) to get candidates, then refine by policy hours in code.
      const bookedCandidates = await manager.getRepository(Stay).find({
        where: {
          status: "booked",
          checkIn: LessThanOrEqual(todayStart.toJSDate()),
          checkOut: MoreThanOrEqual(todayStart.toJSDate()),
        },
        relations: ["room", "room.admin"], // need admin for fallback policy
        // NOTE: lock is not supported on find() options; use QueryBuilder if needed.
      });

      for (const stay of bookedCandidates) {
        const room = stay.room;
        const { inHour, outHour } = policyHoursFor(room);

        const checkInAt = makeLocalDateTime(stay.checkIn, inHour);
        const checkOutAt = makeLocalDateTime(stay.checkOut, outHour);

        // Stay covers "now" by policy hours → ensure occupied
        if (now >= checkInAt && now < checkOutAt) {
          if (stay.status !== "occupied") {
            stay.status = "occupied";
            await manager.getRepository(Stay).save(stay);
          }
          if (room.status !== "occupied") {
            room.status = "occupied";
            await manager.getRepository(Room).save(room);
          }
        }
      }

      // === 2) OCCUPIED → COMPLETED when check-out time has passed ===
      const occupiedCandidates = await manager.getRepository(Stay).find({
        where: {
          status: "occupied",
          checkOut: LessThanOrEqual(todayStart.toJSDate()),
        },
        relations: ["room", "room.admin"],
      });

      for (const stay of occupiedCandidates) {
        const room = stay.room;
        const { outHour } = policyHoursFor(room);
        const checkoutAt = makeLocalDateTime(stay.checkOut, outHour);

        if (now >= checkoutAt) {
          // 2.1) complete the stay
          stay.status = "completed";
          await manager.getRepository(Stay).save(stay);

          // 2.2) decide the new room status
          // Is there any stay (booked or occupied) that covers "now" by day?
          const covering = await manager.getRepository(Stay).findOne({
            where: [
              {
                room: { id: room.id },
                status: "occupied",
                checkIn: LessThanOrEqual(todayStart.toJSDate()),
                checkOut: MoreThanOrEqual(todayStart.toJSDate()),
              },
              {
                room: { id: room.id },
                status: "booked",
                checkIn: LessThanOrEqual(todayStart.toJSDate()),
                checkOut: MoreThanOrEqual(todayStart.toJSDate()),
              },
            ],
            relations: ["room", "room.admin"],
          });

          let newRoomStatus: RoomStatus = "free";

          if (covering) {
            // Refine by exact policy hours for the covering stay
            const covRoom = covering.room;
            const { inHour: covIn, outHour: covOut } = policyHoursFor(covRoom);
            const covInAt = makeLocalDateTime(covering.checkIn, covIn);
            const covOutAt = makeLocalDateTime(covering.checkOut, covOut);

            if (now >= covInAt && now < covOutAt) {
              // If it was booked but its check-in time has arrived, promote it.
              if (covering.status === "booked") {
                covering.status = "occupied";
                await manager.getRepository(Stay).save(covering);
              }
              newRoomStatus = "occupied";
            }
          }

          if (newRoomStatus !== "occupied") {
            // No covering stay right now → look for the next future booking
            const next = await manager.getRepository(Stay).findOne({
              where: {
                room: { id: room.id },
                status: "booked",
                checkIn: MoreThan(todayStart.toJSDate()),
              },
              order: { checkIn: "ASC" },
            });
            newRoomStatus = next ? "booked" : "free";
          }

          if (room.status !== newRoomStatus) {
            room.status = newRoomStatus;
            await manager.getRepository(Room).save(room);
          }
        }
      }

      // === 3) Safety reconciliation (compute from stays for all rooms) ===
      await this.reconcileRooms(manager);
    });
  }

  /**
   * Recompute Room.status for all rooms using policy-hour windows:
   *   - "occupied" if a booked/occupied stay actually covers "now" by policy hours
   *   - else "booked" if there exists a future booked stay
   *   - else "free"
   */
  private async reconcileRooms(manager: EntityManager): Promise<void> {
    const { now } = nowWithTolerance();
    const todayStart = now.startOf("day");

    const rooms = await manager.getRepository(Room).find({
      relations: ["admin"],
    });

    for (const room of rooms) {
      const { inHour, outHour } = policyHoursFor(room);

      const candidates = await manager.getRepository(Stay).find({
        where: [
          {
            room: { id: room.id },
            checkIn: LessThanOrEqual(todayStart.toJSDate()),
            checkOut: MoreThanOrEqual(todayStart.toJSDate()),
            status: In(["booked", "occupied"] as StayStatus[]),
          },
          {
            room: { id: room.id },
            checkIn: MoreThan(todayStart.toJSDate()),
            status: "booked",
          },
        ],
        order: { checkIn: "ASC" },
      });

      // Check if any candidate actually covers 'now' by policy hours
      let covered = false;
      for (const s of candidates.filter(
        (s) =>
          s.checkIn <= todayStart.toJSDate() &&
          s.checkOut >= todayStart.toJSDate()
      )) {
        const sIn = makeLocalDateTime(s.checkIn, inHour);
        const sOut = makeLocalDateTime(s.checkOut, outHour);
        if (now >= sIn && now < sOut) {
          covered = true;
          break;
        }
      }

      const futureBooked = candidates.some(
        (s) => s.status === "booked" && s.checkIn > todayStart.toJSDate()
      );

      const newStatus: RoomStatus = covered
        ? "occupied"
        : futureBooked
        ? "booked"
        : "free";

      if (room.status !== newStatus) {
        room.status = newStatus;
        await manager.getRepository(Room).save(room);
      }
    }
  }
}
