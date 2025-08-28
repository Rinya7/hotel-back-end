// src/controllers/stayQuery.controller.ts
// Purpose: read-only lists of stays for operator dashboards.
// Buttons you described map to these endpoints:
//  - "Booked":     GET /stays/status/booked
//  - "Occupied":   GET /stays/status/occupied
//  - "Arrivals Today":    GET /stays/today/arrivals
//  - "Departures Today":  GET /stays/today/departures
//
// Implementation notes:
//  - Strict filters by hotel owner via JWT (adminId).
//  - DATE-only comparisons are composed in Europe/Rome (APP_TIMEZONE).

import { Response } from "express";
import { AppDataSource } from "../config/data-source";
import { AuthRequest } from "../middlewares/authMiddleware";
import { Stay } from "../entities/Stay";
import { getOwnerAdminId } from "../utils/owner";
import { DateTime } from "luxon";
import { APP_TIMEZONE } from "../config/time";

type StayStatus = "booked" | "occupied" | "completed" | "cancelled";

/** GET /stays/status/:status — list stays by status (booked|occupied) for current hotel */
export const getStaysByStatus = async (req: AuthRequest, res: Response) => {
  const ownerAdminId = getOwnerAdminId(req);
  const statusParam = String(req.params.status) as StayStatus;

  if (!["booked", "occupied", "completed", "cancelled"].includes(statusParam)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const stays = await AppDataSource.getRepository(Stay).find({
    where: { status: statusParam, room: { admin: { id: ownerAdminId } } },
    relations: ["room"],
    order: { checkIn: "ASC", id: "ASC" },
  });

  // Return minimal but useful shape for list pages
  const data = stays.map((s) => ({
    stayId: s.id,
    status: s.status,
    room: {
      id: s.room.id,
      number: s.room.roomNumber,
      floor: s.room.floor,
    },
    mainGuestName: s.mainGuestName,
    checkIn: s.checkIn, // DATE (yyyy-mm-dd)
    checkOut: s.checkOut, // DATE (yyyy-mm-dd)
    balance: s.balance,
  }));

  return res.json({ count: data.length, items: data });
};

/** Helpers for "today" boundaries in hotel timezone */
function todayDateInHotelTZ(): Date {
  const now = DateTime.now().setZone(APP_TIMEZONE).startOf("day");
  return now.toJSDate();
}

/** GET /stays/today/arrivals — stays with checkIn = today (DATE) and status booked or occupied */
export const getArrivalsToday = async (req: AuthRequest, res: Response) => {
  const ownerAdminId = getOwnerAdminId(req);
  const today = todayDateInHotelTZ();

  const stays = await AppDataSource.getRepository(Stay).find({
    where: [
      {
        room: { admin: { id: ownerAdminId } },
        status: "booked",
        checkIn: today,
      },
      {
        room: { admin: { id: ownerAdminId } },
        status: "occupied",
        checkIn: today,
      },
    ],
    relations: ["room"],
    order: { checkIn: "ASC", id: "ASC" },
  });

  const items = stays.map((s) => ({
    stayId: s.id,
    status: s.status,
    room: { id: s.room.id, number: s.room.roomNumber, floor: s.room.floor },
    mainGuestName: s.mainGuestName,
    checkIn: s.checkIn,
    checkOut: s.checkOut,
  }));

  return res.json({ count: items.length, items });
};

/** GET /stays/today/departures — stays with checkOut = today (DATE) and status occupied */
export const getDeparturesToday = async (req: AuthRequest, res: Response) => {
  const ownerAdminId = getOwnerAdminId(req);
  const today = todayDateInHotelTZ();

  const stays = await AppDataSource.getRepository(Stay).find({
    where: [
      {
        room: { admin: { id: ownerAdminId } },
        status: "occupied",
        checkOut: today,
      },
      // optionally include "booked with same-day out" if you allow day-use:
      // { room: { admin: { id: ownerAdminId } }, status: "booked", checkOut: today },
    ],
    relations: ["room"],
    order: { checkOut: "ASC", id: "ASC" },
  });

  const items = stays.map((s) => ({
    stayId: s.id,
    status: s.status,
    room: { id: s.room.id, number: s.room.roomNumber, floor: s.room.floor },
    mainGuestName: s.mainGuestName,
    checkIn: s.checkIn,
    checkOut: s.checkOut,
  }));

  return res.json({ count: items.length, items });
};
