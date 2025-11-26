// src/utils/owner.ts
// English comments: resolve hotel owner id from JWT (adminId in our token).

import { AuthRequest } from "../middlewares/authMiddleware";

export function getOwnerAdminId(req: AuthRequest): number {
  if (!req.user) {
    throw new Error("No auth user in request");
  }
  if (typeof req.user.adminId !== "number") {
    throw new Error(`Invalid adminId in token: ${req.user.adminId} (type: ${typeof req.user.adminId})`);
  }
  return req.user.adminId; // owner id for both admin and editor
}
