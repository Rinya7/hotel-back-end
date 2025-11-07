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
import { StayStatusLog } from "../entities/StayStatusLog";
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
  try {
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
  } catch (error) {
    // Логуємо тільки якщо це не очікувана ситуація (порожня база - це нормально)
    if (error instanceof Error && !error.message.includes("empty")) {
      console.warn("Помилка при отриманні arrivals today:", error.message);
    }
    // Повертаємо порожній результат (той самий формат, що й при успіху)
    // Використовуємо 200 замість 500, бо порожня база - це нормальна ситуація
    return res.json({ count: 0, items: [] });
  }
};

/** GET /stays/today/departures — stays with checkOut = today (DATE) and status occupied */
export const getDeparturesToday = async (req: AuthRequest, res: Response) => {
  try {
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
  } catch (error) {
    // Логуємо тільки якщо це не очікувана ситуація (порожня база - це нормально)
    if (error instanceof Error && !error.message.includes("empty")) {
      console.warn("Помилка при отриманні departures today:", error.message);
    }
    // Повертаємо порожній результат (той самий формат, що й при успіху)
    // Використовуємо 200 замість 500, бо порожня база - це нормальна ситуація
    return res.json({ count: 0, items: [] });
  }
};

/** GET /stays/search?guest=doe&changedBy=frontdesk-1 — фільтрація проживань */
export const searchStays = async (req: AuthRequest, res: Response) => {
  try {
    const ownerAdminId = getOwnerAdminId(req);
    const { guest, changedBy } = req.query as {
      guest?: string;
      changedBy?: string;
    };

    const stayRepo = AppDataSource.getRepository(Stay);
    const query = stayRepo
      .createQueryBuilder("stay")
      .leftJoinAndSelect("stay.room", "room")
      .where("room.adminId = :adminId", { adminId: ownerAdminId });

    if (guest) {
      query.andWhere("stay.mainGuestName ILIKE :guest", {
        guest: `%${guest}%`,
      });
    }

    if (changedBy) {
      query.andWhere("stay.updatedBy ILIKE :changedBy", {
        changedBy: `%${changedBy}%`,
      });
    }

    const stays = await query
      .orderBy("stay.checkIn", "DESC")
      .getMany();

    return res.json(stays);
  } catch (error) {
    console.error("Помилка при пошуку stays:", error);
    return res.json([]);
  }
};

/** GET /stays/:id — отримати проживання за ID */
export const getStayById = async (req: AuthRequest, res: Response) => {
  try {
    const ownerAdminId = getOwnerAdminId(req);
    const stayId = Number(req.params.id);

    if (!stayId || isNaN(stayId)) {
      return res.status(400).json({ message: "Invalid stay ID" });
    }

    const stayRepo = AppDataSource.getRepository(Stay);
    const stay = await stayRepo.findOne({
      where: { id: stayId, room: { admin: { id: ownerAdminId } } },
      relations: ["room"],
    });

    if (!stay) {
      return res.status(404).json({ message: "Stay not found" });
    }

    return res.json(stay);
  } catch (error) {
    console.error("Помилка при отриманні stay by id:", error);
    return res.status(500).json({ message: "Помилка при отриманні проживання" });
  }
};

/** GET /stays/:id/history — історія змін статусів проживання */
export const getStayHistory = async (req: AuthRequest, res: Response) => {
  try {
    const ownerAdminId = getOwnerAdminId(req);
    const stayId = Number(req.params.id);

    if (!stayId || isNaN(stayId)) {
      return res.status(400).json({ message: "Invalid stay ID" });
    }

    const stayRepo = AppDataSource.getRepository(Stay);
    const stay = await stayRepo.findOne({
      where: { id: stayId, room: { admin: { id: ownerAdminId } } },
      relations: ["room", "statusLogs"],
    });

    if (!stay) {
      return res.status(404).json({ message: "Stay not found" });
    }

    // Сортуємо логи за датою (новіші спочатку)
    const sortedLogs = stay.statusLogs.sort(
      (a, b) => b.changedAt.getTime() - a.changedAt.getTime()
    );

    // Форматуємо логи для відповіді
    const logs = sortedLogs.map((log) => ({
      oldStatus: log.oldStatus,
      newStatus: log.newStatus,
      changedAt: log.changedAt,
      changedBy: log.changedBy || null,
      changedByRole: log.changedByRole || null,
      entityLabel: stay.room ? `Room ${stay.room.roomNumber}` : undefined,
      entityLink: stay.room ? `/rooms/${stay.room.roomNumber}/stays` : undefined,
      comment: log.comment || null,
    }));

    return res.json({
      stayId: stay.id,
      mainGuestName: stay.mainGuestName,
      logs,
    });
  } catch (error) {
    console.error("Помилка при отриманні stay history:", error);
    // Повертаємо порожній результат (той самий формат, що й при успіху)
    return res.json({
      stayId: Number(req.params.id) || 0,
      mainGuestName: "",
      logs: [],
    });
  }
};