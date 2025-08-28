// src/routes/roomPolicy.routes.ts
import { Router } from "express";
import {
  authenticateToken,
  isEditorOrAdmin,
} from "../middlewares/authMiddleware";
import { bulkSetRoomPolicyHours } from "../controllers/roomPolicy.controller";

const router = Router();

// Single bulk endpoint (we removed admin-level policy routes)
router.put(
  "/rooms/policy-hours/bulk",
  authenticateToken,
  isEditorOrAdmin,
  bulkSetRoomPolicyHours
);

export default router;
