// src/routes/audit.routes.ts
// Роути для audit logs

import { Router } from "express";
import { getAuditLogs } from "../controllers/audit.controller";
import {
  authenticateToken,
  isEditorOrAdmin,
} from "../middlewares/authMiddleware";

const router = Router();

/**
 * GET /audit/logs — універсальний endpoint для отримання audit logs
 * Query параметри:
 * - type: "room" | "stay" (опціонально)
 * - user: фільтр по changedBy
 * - role: фільтр по changedByRole
 * - from: дата початку (ISO string)
 * - to: дата кінця (ISO string)
 */
router.get("/logs", authenticateToken, isEditorOrAdmin, getAuditLogs);

export default router;




