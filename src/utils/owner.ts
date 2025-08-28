// src/utils/owner.ts
// English comments: resolve hotel owner id from JWT (adminId in our token).

import { AuthRequest } from "../middlewares/authMiddleware";

export function getOwnerAdminId(req: AuthRequest): number {
  if (!req.user) throw new Error("No auth user in request");
  return req.user.adminId; // owner id for both admin and editor
}
