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
