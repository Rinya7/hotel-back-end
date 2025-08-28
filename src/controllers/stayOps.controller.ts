// src/controllers/stayOps.controller.ts
// Purpose: manual ops for check-in / check-out / cancel with immediate room status sync.

import { Response } from "express";
import { AppDataSource } from "../config/data-source";
import { AuthRequest } from "../middlewares/authMiddleware";
import { Stay } from "../entities/Stay";
import { Room } from "../entities/Room";
import { Admin } from "../entities/Admin";
import { getOwnerAdminId } from "../utils/owner";
import { LessThanOrEqual, MoreThanOrEqual, MoreThan } from "typeorm";
import { DateTime } from "luxon";
import { APP_TIMEZONE } from "../config/time";

type StayStatus = "booked" | "occupied" | "completed" | "cancelled";
type RoomStatus = "free" | "booked" | "occupied";

interface ForceBody {
  force?: boolean;
}

/** Compose local DateTime from DATE-only + hour in APP_TIMEZONE. */
function makeLocalDateTime(dateOnly: Date, hour: number): Date {
  const js = new Date(dateOnly);
  const y = js.getUTCFullYear();
  const m = js.getUTCMonth() + 1;
  const d = js.getUTCDate();
  return DateTime.fromObject(
    { year: y, month: m, day: d, hour },
    { zone: APP_TIMEZONE }
  ).toJSDate();
}

/** Policy hours precedence: Room → Admin → global defaults (14/10 fallback here). */
function policyHoursFor(room: Room): { inHour: number; outHour: number } {
  const DEFAULT_IN = 14;
  const DEFAULT_OUT = 10;
  if (
    Number.isInteger(room.checkInHour) &&
    Number.isInteger(room.checkOutHour)
  ) {
    return {
      inHour: room.checkInHour as number,
      outHour: room.checkOutHour as number,
    };
  }
  const admin: Admin | undefined = room.admin;
  if (
    admin &&
    Number.isInteger(admin.checkInHour) &&
    Number.isInteger(admin.checkOutHour)
  ) {
    return { inHour: admin.checkInHour, outHour: admin.checkOutHour };
  }
  return { inHour: DEFAULT_IN, outHour: DEFAULT_OUT };
}

/** Recompute and persist room.status for a single room based on current time and stays. */
async function recomputeRoomStatus(room: Room): Promise<void> {
  const now = DateTime.now().setZone(APP_TIMEZONE);
  const todayStart = now.startOf("day").toJSDate();
  const { inHour, outHour } = policyHoursFor(room);

  const repo = AppDataSource.getRepository(Stay);
  // Candidates: covering today (booked/occupied) or future booked
  const candidates = await repo.find({
    where: [
      {
        room: { id: room.id },
        checkIn: LessThanOrEqual(todayStart),
        checkOut: MoreThanOrEqual(todayStart),
        status: "booked" as StayStatus,
      },
      {
        room: { id: room.id },
        checkIn: LessThanOrEqual(todayStart),
        checkOut: MoreThanOrEqual(todayStart),
        status: "occupied" as StayStatus,
      },
      {
        room: { id: room.id },
        checkIn: MoreThan(todayStart),
        status: "booked" as StayStatus,
      },
    ],
    order: { checkIn: "ASC" },
  });

  // Does anyone cover "now" by policy hours?
  const covered = candidates.some((s) => {
    const sIn = DateTime.fromJSDate(makeLocalDateTime(s.checkIn, inHour), {
      zone: APP_TIMEZONE,
    });
    const sOut = DateTime.fromJSDate(makeLocalDateTime(s.checkOut, outHour), {
      zone: APP_TIMEZONE,
    });
    return now >= sIn && now < sOut;
  });

  let newStatus: RoomStatus;
  if (covered) {
    newStatus = "occupied";
  } else {
    const hasFutureBooked = candidates.some(
      (s) => s.status === "booked" && s.checkIn > todayStart
    );
    newStatus = hasFutureBooked ? "booked" : "free";
  }

  if (room.status !== newStatus) {
    room.status = newStatus;
    await AppDataSource.getRepository(Room).save(room);
  }
}

/** POST /stays/:id/check-in — mark stay as occupied (optionally force) */
export const manualCheckIn = async (req: AuthRequest, res: Response) => {
  const ownerAdminId = getOwnerAdminId(req);
  const stayId = Number(req.params.id);
  const { force } = (req.body || {}) as ForceBody;

  const stayRepo = AppDataSource.getRepository(Stay);
  const stay = await stayRepo.findOne({
    where: { id: stayId, room: { admin: { id: ownerAdminId } } },
    relations: ["room", "room.admin"],
  });
  if (!stay) return res.status(404).json({ message: "Stay not found" });

  // Normal flow: only booked can become occupied
  if (!force && stay.status !== "booked") {
    return res
      .status(400)
      .json({
        message: "Only booked stay can be checked in (use force to override)",
      });
  }

  stay.status = "occupied";
  await stayRepo.save(stay);

  // Sync room now
  await recomputeRoomStatus(stay.room);

  return res.json({
    ok: true,
    stayId: stay.id,
    status: stay.status,
    roomStatus: stay.room.status,
  });
};

/** POST /stays/:id/check-out — mark stay as completed (optionally force) */
export const manualCheckOut = async (req: AuthRequest, res: Response) => {
  const ownerAdminId = getOwnerAdminId(req);
  const stayId = Number(req.params.id);
  const { force } = (req.body || {}) as ForceBody;

  const stayRepo = AppDataSource.getRepository(Stay);
  const stay = await stayRepo.findOne({
    where: { id: stayId, room: { admin: { id: ownerAdminId } } },
    relations: ["room", "room.admin"],
  });
  if (!stay) return res.status(404).json({ message: "Stay not found" });

  // Normal flow: only occupied can become completed
  if (!force && stay.status !== "occupied") {
    return res
      .status(400)
      .json({
        message:
          "Only occupied stay can be checked out (use force to override)",
      });
  }

  stay.status = "completed";
  await stayRepo.save(stay);

  await recomputeRoomStatus(stay.room);

  return res.json({
    ok: true,
    stayId: stay.id,
    status: stay.status,
    roomStatus: stay.room.status,
  });
};

/** POST /stays/:id/cancel — cancel a booked stay and sync room */
export const manualCancel = async (req: AuthRequest, res: Response) => {
  const ownerAdminId = getOwnerAdminId(req);
  const stayId = Number(req.params.id);

  const stayRepo = AppDataSource.getRepository(Stay);
  const stay = await stayRepo.findOne({
    where: { id: stayId, room: { admin: { id: ownerAdminId } } },
    relations: ["room", "room.admin"],
  });
  if (!stay) return res.status(404).json({ message: "Stay not found" });

  if (stay.status !== "booked") {
    return res
      .status(400)
      .json({ message: "Only booked stay can be cancelled" });
  }

  stay.status = "cancelled";
  await stayRepo.save(stay);

  await recomputeRoomStatus(stay.room);

  return res.json({
    ok: true,
    stayId: stay.id,
    status: stay.status,
    roomStatus: stay.room.status,
  });
};
