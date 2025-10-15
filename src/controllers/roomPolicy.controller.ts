// src/controllers/roomPolicy.controller.ts
// Purpose: bulk operations for per-room policy hours.
// Strategy: we do NOT support editing admin-level policy via API anymore.
//          Only per-room or bulk-for-all-rooms-in-hotel.

import { Response } from "express";
import { AppDataSource } from "../config/data-source";
import { Room } from "../entities/Room";
import { AuthRequest } from "../middlewares/authMiddleware";
import { isHourOrNull } from "../utils/hours";
import { getOwnerAdminId } from "../utils/owner";
import { ROLES } from "../auth/roles";

/** Request body for bulk set operation (both fields optional, at least one required). */
interface BulkPolicyBody {
  checkInHour?: number | null;
  checkOutHour?: number | null;
}

/** Request body for bulk Wi-Fi update (both fields required). */
interface BulkWiFiBody {
  wifiName: string;
  wifiPassword: string;
}

/**
 * PUT /rooms/policy-hours/bulk
 * Access: admin or editor of the current hotel.
 *
 * Behavior:
 *  - If a field is provided (even `null`) → update that field on ALL rooms of the hotel.
 *  - If a field is omitted (`undefined`) → do NOT touch that field.
 *  - `null` means "follow hotel defaults" for that room (Room.checkInHour/OutHour = NULL).
 * Implementation: one UPDATE with QueryBuilder, no per-row loops.
 */
export const bulkSetRoomPolicyHours = async (
  req: AuthRequest,
  res: Response
) => {
  // Extra safety; normally guarded in routes.
  if (
    !req.user ||
    !(req.user.role === ROLES.ADMIN || req.user.role === ROLES.EDITOR)
  ) {
    return res.status(403).json({ message: "Access denied" });
  }

  const ownerAdminId = getOwnerAdminId(req);
  const { checkInHour, checkOutHour } = req.body as BulkPolicyBody;

  if (
    typeof checkInHour === "undefined" &&
    typeof checkOutHour === "undefined"
  ) {
    return res.status(400).json({
      message: "Provide at least one of: checkInHour, checkOutHour",
    });
  }

  if (typeof checkInHour !== "undefined" && !isHourOrNull(checkInHour)) {
    return res.status(400).json({
      message: "checkInHour must be an integer 0..23 or null",
    });
  }
  if (typeof checkOutHour !== "undefined" && !isHourOrNull(checkOutHour)) {
    return res.status(400).json({
      message: "checkOutHour must be an integer 0..23 or null",
    });
  }

  const set: Partial<Pick<Room, "checkInHour" | "checkOutHour">> = {};
  if (typeof checkInHour !== "undefined") set.checkInHour = checkInHour;
  if (typeof checkOutHour !== "undefined") set.checkOutHour = checkOutHour;

  const result = await AppDataSource.createQueryBuilder()
    .update(Room)
    .set(set)
    .where(`"adminId" = :ownerAdminId`, { ownerAdminId })
    .execute();

  return res.status(200).json({
    ok: true,
    updated: result.affected ?? 0,
    applied: {
      ...(typeof checkInHour !== "undefined" ? { checkInHour } : {}),
      ...(typeof checkOutHour !== "undefined" ? { checkOutHour } : {}),
    },
  });
};

/**
 * PUT /rooms/wifi/bulk
 * Access: admin or editor of the current hotel.
 *
 * Behavior:
 *  - Updates wifiName and wifiPassword for ALL rooms of the hotel.
 *  - Both fields are required.
 * Implementation: one UPDATE with QueryBuilder, no per-row loops.
 */
export const bulkSetRoomWiFi = async (req: AuthRequest, res: Response) => {
  // Extra safety; normally guarded in routes.
  if (
    !req.user ||
    !(req.user.role === ROLES.ADMIN || req.user.role === ROLES.EDITOR)
  ) {
    return res.status(403).json({ message: "Access denied" });
  }

  const ownerAdminId = getOwnerAdminId(req);
  const { wifiName, wifiPassword } = req.body as BulkWiFiBody;

  // Валидация: оба поля обязательны
  if (
    typeof wifiName !== "string" ||
    wifiName.trim().length === 0 ||
    typeof wifiPassword !== "string" ||
    wifiPassword.trim().length === 0
  ) {
    return res.status(400).json({
      message:
        "Both wifiName and wifiPassword are required and must be non-empty strings",
    });
  }

  // Проверяем длину (в БД лимит 100 символов)
  if (wifiName.length > 100 || wifiPassword.length > 100) {
    return res.status(400).json({
      message: "wifiName and wifiPassword must not exceed 100 characters",
    });
  }

  // Обновляем все комнаты отеля
  const result = await AppDataSource.createQueryBuilder()
    .update(Room)
    .set({
      wifiName: wifiName.trim(),
      wifiPassword: wifiPassword.trim(),
    })
    .where(`"adminId" = :ownerAdminId`, { ownerAdminId })
    .execute();

  return res.status(200).json({
    message: "Wi-Fi credentials updated successfully",
    updated: result.affected ?? 0,
    applied: {
      wifiName: wifiName.trim(),
      wifiPassword: "***", // Не показываем пароль в ответе
    },
  });
};
