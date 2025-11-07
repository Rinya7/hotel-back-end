// src/controllers/audit.controller.ts
// Універсальний endpoint для отримання audit logs з RoomStatusLog та StayStatusLog

import { Response } from "express";
import { AppDataSource } from "../config/data-source";
import { AuthRequest } from "../middlewares/authMiddleware";
import { RoomStatusLog } from "../entities/RoomStatusLog";
import { StayStatusLog } from "../entities/StayStatusLog";
import { getOwnerAdminId } from "../utils/owner";

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
    const { type, user, role, from, to } = req.query as Record<string, string | undefined>;

    const roomRepo = AppDataSource.getRepository(RoomStatusLog);
    const stayRepo = AppDataSource.getRepository(StayStatusLog);

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

    const allLogs: Array<{
      type: "room" | "stay";
      entityLabel: string;
      entityLink: string | null;
      oldStatus: string;
      newStatus: string;
      changedAt: Date;
      changedBy: string | null;
      changedByRole: string | null;
      comment: string | null;
    }> = [];

    // Якщо не вказано тип або type=room — беремо логи кімнат
    if (!type || type === "room") {
      try {
        const roomLogs = await roomQuery
          .orderBy("log.changedAt", "DESC")
          .getMany();

        allLogs.push(
          ...roomLogs.map((log) => ({
            type: "room" as const,
            entityLabel: log.room ? `Room ${log.room.roomNumber}` : "Unknown Room",
            entityLink: log.room ? `/rooms/${log.room.roomNumber}/stays` : null,
            oldStatus: log.oldStatus,
            newStatus: log.newStatus,
            changedAt: log.changedAt,
            changedBy: log.changedBy || null,
            changedByRole: log.changedByRole || null,
            comment: log.comment || null,
          }))
        );
      } catch (roomError) {
        console.warn("Помилка при отриманні room logs:", roomError);
        // Продовжуємо виконання, навіть якщо не вдалося отримати room logs
      }
    }

    // Якщо не вказано тип або type=stay — беремо логи проживань
    if (!type || type === "stay") {
      try {
        const stayLogs = await stayQuery
          .orderBy("log.changedAt", "DESC")
          .getMany();

        allLogs.push(
          ...stayLogs.map((log) => ({
            type: "stay" as const,
            entityLabel: log.stay?.mainGuestName || "Unknown Guest",
            entityLink: log.stay ? `/stays/${log.stay.id}` : null,
            oldStatus: log.oldStatus,
            newStatus: log.newStatus,
            changedAt: log.changedAt,
            changedBy: log.changedBy || null,
            changedByRole: log.changedByRole || null,
            comment: log.comment || null,
          }))
        );
      } catch (stayError) {
        console.warn("Помилка при отриманні stay logs:", stayError);
        // Продовжуємо виконання, навіть якщо не вдалося отримати stay logs
      }
    }

    // Сортуємо всі логи за датою (новіші спочатку)
    allLogs.sort(
      (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
    );

    // Завжди повертаємо масив (навіть якщо порожній)
    return res.json(allLogs);
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

