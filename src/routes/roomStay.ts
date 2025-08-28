//проживания по конкретному номеру
// src/routes/roomStay.routes.ts
import { Router } from "express";
import {
  createStayForRoom,
  updateStayByDates,
  closeStay,
  getStaysForRoom,
} from "../controllers/stayController";
import {
  authenticateToken,
  isEditorOrAdmin, // admin + editor
} from "../middlewares/authMiddleware";

const router = Router();

/**
 * Create a stay for a specific room.
 * POST /rooms/number/:roomNumber/stays
 */
router.post(
  "/number/:roomNumber/stays",
  authenticateToken,
  isEditorOrAdmin,
  createStayForRoom
);

/**
 * Get history of stays for a specific room (optional ?from=YYYY-MM-DD&to=YYYY-MM-DD)
 * GET /rooms/number/:roomNumber/stays
 */
router.get(
  "/number/:roomNumber/stays",
  authenticateToken,
  isEditorOrAdmin,
  getStaysForRoom
);

/**
 * Update a stay for a room by checkIn/checkOut (full edit scenario)
 * PUT /rooms/number/:roomNumber/stays
 */
router.put(
  "/number/:roomNumber/stays",
  authenticateToken,
  isEditorOrAdmin,
  updateStayByDates
);

/**
 * Close (completed) or cancel a stay for a room
 * PUT /rooms/number/:roomNumber/stays/close
 */
router.put(
  "/number/:roomNumber/stays/close",
  authenticateToken,
  isEditorOrAdmin,
  closeStay
);

export default router;
