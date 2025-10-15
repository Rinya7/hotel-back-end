// src/routes/roomPolicy.routes.ts
import { Router } from "express";
import {
  authenticateToken,
  isEditorOrAdmin,
} from "../middlewares/authMiddleware";
import {
  bulkSetRoomPolicyHours,
  bulkSetRoomWiFi,
} from "../controllers/roomPolicy.controller";

const router = Router();

// Bulk endpoint для policy hours
router.put(
  "/rooms/policy-hours/bulk",
  authenticateToken,
  isEditorOrAdmin,
  bulkSetRoomPolicyHours
);

// Bulk endpoint для Wi-Fi credentials
router.put(
  "/rooms/wifi/bulk",
  authenticateToken,
  isEditorOrAdmin,
  bulkSetRoomWiFi
);

export default router;
