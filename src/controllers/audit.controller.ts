// src/controllers/audit.controller.ts
// Універсальний endpoint для отримання audit logs з RoomStatusLog та StayStatusLog

import { Response } from "express";
import { AppDataSource } from "../config/data-source";
import { AuthRequest } from "../middlewares/authMiddleware";
import { RoomStatusLog } from "../entities/RoomStatusLog";
import { StayStatusLog } from "../entities/StayStatusLog";
import { getOwnerAdminId } from "../utils/owner";

/**
 * Конвертує Date в строку формату YYYY-MM-DD
 * Якщо вже строка - повертає як є
 */
const formatDateToString = (date: Date | string | null): string | null => {
  if (!date) return null;
  if (typeof date === "string") return date;
  if (date instanceof Date) {
    return date.toISOString().split("T")[0];
  }
  return null;
};

/**
 * GET /audit/logs — універсальний endpoint для отримання audit logs
 * Query параметри:
 * - type: "room" | "stay" (опціонально, якщо не вказано — обидва)
 * - user: фільтр по changedBy (ILIKE)
 * - role: фільтр по changedByRole (точне співпадіння)
 * - from: дата початку (ISO string)
 * - to: дата кінця (ISO string)
 */
export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const ownerAdminId = getOwnerAdminId(req);
    const { type, user, role, from, to, roomNumber, stayId, bookingCode } = req.query as Record<string, string | undefined>;

    const roomRepo = AppDataSource.getRepository(RoomStatusLog);
    const stayRepo = AppDataSource.getRepository(StayStatusLog);

    const normalizedRoomNumber = roomNumber?.trim() ?? "";
    const normalizedBookingCode = bookingCode?.trim() ?? "";
    const stayIdNumber = stayId ? Number.parseInt(stayId, 10) : undefined;
    const hasRoomNumberFilter = normalizedRoomNumber.length > 0;
    const hasStayIdFilter = Number.isInteger(stayIdNumber);
    const hasBookingCodeFilter = normalizedBookingCode.length > 0;

    const includeRoomLogs = !type || type === "room";
    const includeStayLogs = !type || type === "stay";

    // Побудова фільтрації для RoomStatusLog через QueryBuilder
    const roomQuery = roomRepo
      .createQueryBuilder("log")
      .leftJoinAndSelect("log.room", "room")
      .leftJoinAndSelect("room.admin", "admin")
      .leftJoinAndSelect("log.stay", "stay")
      .where("admin.id = :ownerAdminId", { ownerAdminId });

    if (user) {
      roomQuery.andWhere("log.changedBy ILIKE :user", { user: `%${user}%` });
    }
    if (role) {
      roomQuery.andWhere("log.changedByRole = :role", { role });
    }
    if (from && to) {
      roomQuery.andWhere("log.changedAt BETWEEN :from AND :to", {
        from: new Date(from),
        to: new Date(to),
      });
    } else if (from) {
      roomQuery.andWhere("log.changedAt >= :from", { from: new Date(from) });
    } else if (to) {
      roomQuery.andWhere("log.changedAt <= :to", { to: new Date(to) });
    }

    if (hasRoomNumberFilter) {
      roomQuery.andWhere("room.roomNumber ILIKE :roomNumber", {
        roomNumber: `%${normalizedRoomNumber}%`,
      });
    }

    // Побудова фільтрації для StayStatusLog через QueryBuilder
    const stayQuery = stayRepo
      .createQueryBuilder("log")
      .leftJoinAndSelect("log.stay", "stay")
      .leftJoinAndSelect("stay.room", "room")
      .leftJoinAndSelect("room.admin", "admin")
      .where("admin.id = :ownerAdminId", { ownerAdminId });

    if (user) {
      stayQuery.andWhere("log.changedBy ILIKE :user", { user: `%${user}%` });
    }
    if (role) {
      stayQuery.andWhere("log.changedByRole = :role", { role });
    }
    if (from && to) {
      stayQuery.andWhere("log.changedAt BETWEEN :from AND :to", {
        from: new Date(from),
        to: new Date(to),
      });
    } else if (from) {
      stayQuery.andWhere("log.changedAt >= :from", { from: new Date(from) });
    } else if (to) {
      stayQuery.andWhere("log.changedAt <= :to", { to: new Date(to) });
    }

    if (hasStayIdFilter && stayIdNumber !== undefined) {
      stayQuery.andWhere("stay.id = :stayId", { stayId: stayIdNumber });
    }

    if (hasRoomNumberFilter) {
      stayQuery.andWhere("room.roomNumber ILIKE :roomNumber", {
        roomNumber: `%${normalizedRoomNumber}%`,
      });
    }

    let allLogs: Array<{
      type: "room" | "stay";
      entityLabel: string;
      entityLink: string | null;
      oldStatus: string;
      newStatus: string;
      changedAt: Date;
      changedBy: string | null;
      changedByRole: string | null;
      comment: string | null;
      stayCheckIn: string | null;
      stayCheckOut: string | null;
      roomNumber: string | null;
      stayId: number | null;
      bookingCode: string | null;
    }> = [];

    // Якщо не вказано тип або type=room — беремо логи кімнат
    if (includeRoomLogs) {
      try {
        const roomLogs = await roomQuery
          .orderBy("log.changedAt", "DESC")
          .getMany();

        allLogs.push(
          ...roomLogs.map((log) => ({
            type: "room" as const,
            entityLabel:
              log.room && log.stay
                ? `${log.room.roomNumber}-${log.stay.id}`
                : log.room?.roomNumber ?? "—",
            entityLink: log.room ? `/rooms/${log.room.roomNumber}/stays` : null,
            oldStatus: log.oldStatus,
            newStatus: log.newStatus,
            changedAt: log.changedAt,
            changedBy: log.changedBy || null,
            changedByRole: log.changedByRole || null,
            comment: log.comment || null,
            stayCheckIn: log.stay ? formatDateToString(log.stay.checkIn) : null,
            stayCheckOut: log.stay ? formatDateToString(log.stay.checkOut) : null,
            roomNumber: log.room ? log.room.roomNumber : null,
            stayId: log.stay ? log.stay.id : null,
            bookingCode:
              log.room && log.stay ? `${log.room.roomNumber}-${log.stay.id}` : null,
          }))
        );
      } catch (roomError) {
        console.warn("Помилка при отриманні room logs:", roomError);
        // Продовжуємо виконання, навіть якщо не вдалося отримати room logs
      }
    }

    // Якщо не вказано тип або type=stay — беремо логи проживань
    if (includeStayLogs) {
      try {
        const stayLogs = await stayQuery
          .orderBy("log.changedAt", "DESC")
          .getMany();

        allLogs.push(
          ...stayLogs.map((log) => ({
            type: "stay" as const,
            entityLabel:
              log.stay?.room?.roomNumber && log.stay
                ? `${log.stay.room.roomNumber}-${log.stay.id}`
                : log.stay
                ? String(log.stay.id)
                : "—",
            entityLink:
              log.stay?.room?.roomNumber
                ? `/rooms/${log.stay.room.roomNumber}/stays`
                : null,
            oldStatus: log.oldStatus,
            newStatus: log.newStatus,
            changedAt: log.changedAt,
            changedBy: log.changedBy || null,
            changedByRole: log.changedByRole || null,
            comment: log.comment || null,
            stayCheckIn: log.stay ? formatDateToString(log.stay.checkIn) : null,
            stayCheckOut: log.stay ? formatDateToString(log.stay.checkOut) : null,
            roomNumber: log.stay?.room ? log.stay.room.roomNumber : null,
            stayId: log.stay ? log.stay.id : null,
            bookingCode:
              log.stay?.room?.roomNumber && log.stay
                ? `${log.stay.room.roomNumber}-${log.stay.id}`
                : null,
          }))
        );
      } catch (stayError) {
        console.warn("Помилка при отриманні stay logs:", stayError);
        // Продовжуємо виконання, навіть якщо не вдалося отримати stay logs
      }
    }

    if (hasRoomNumberFilter) {
      const search = normalizedRoomNumber.toLowerCase();
      allLogs = allLogs.filter((log) => {
        const roomMatches = log.roomNumber?.toLowerCase().includes(search);
        const bookingMatches = log.bookingCode
          ? log.bookingCode.toLowerCase().includes(search)
          : false;
        return roomMatches || bookingMatches;
      });
    }

    if (hasStayIdFilter && stayIdNumber !== undefined) {
      const search = stayIdNumber;
      allLogs = allLogs.filter((log) => {
        if (log.stayId === search) {
          return true;
        }
        if (log.bookingCode) {
          const bookingStayPart = Number.parseInt(
            log.bookingCode.split("-").pop() ?? "",
            10
          );
          return bookingStayPart === search;
        }
        return false;
      });
    }

    if (hasBookingCodeFilter) {
      const search = normalizedBookingCode.toLowerCase();
      allLogs = allLogs.filter((log) =>
        log.bookingCode?.toLowerCase().includes(search)
      );
    }

    allLogs.sort(
      (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
    );

    // Завжди повертаємо масив (навіть якщо порожній)
    return res.json(
      allLogs.map((log) => ({
        type: log.type,
        entityLabel: log.entityLabel,
        entityLink: log.entityLink,
        oldStatus: log.oldStatus,
        newStatus: log.newStatus,
        changedAt: log.changedAt,
        changedBy: log.changedBy,
        changedByRole: log.changedByRole,
        comment: log.comment,
        stayCheckIn: log.stayCheckIn,
        stayCheckOut: log.stayCheckOut,
        roomNumber: log.roomNumber,
        stayId: log.stayId,
        bookingCode: log.bookingCode,
      }))
    );
  } catch (error) {
    console.error("Помилка при отриманні audit logs:", error);
    // У випадку помилки повертаємо порожній масив замість помилки
    // щоб frontend міг коректно відобразити стан "немає даних"
    return res.status(500).json({
      message: "Помилка при отриманні audit logs",
      error: error instanceof Error ? error.message : "Unknown error",
      logs: [], // Завжди повертаємо масив
    });
  }
};

