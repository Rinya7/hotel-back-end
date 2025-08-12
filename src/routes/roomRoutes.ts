// src/routes/roomRoutes.ts
import { Router } from "express";
import {
  getAllRooms,
  getRooms,
  createRoom,
  updateRoom,
  updateRoomStatus,
  deleteRoom,
} from "../controllers/roomController";

import {
  authenticateToken,
  isAdmin,
  isEditorOrAdmin,
  isSuperadmin,
} from "../middlewares/authMiddleware";
import { getRoomStats } from "../controllers/stayController";
import {
  getAvailabilityForAllRooms,
  getRoomAvailability,
} from "../controllers/roomAvailabilityController";

const router = Router();

// ➕➕➕ Room Routes ➕➕➕

// 🔓 Перегляд усіх кімнат по всій системі для superadmin
// GET /rooms/all
// (для адміна, який керує всіма готелями)
router.get("/all", authenticateToken, isSuperadmin, getAllRooms);

// 🔓 Перегляд кімнат поточного адміна/editor
// GET /rooms
// (editor може бачити кімнати свого адміна)
router.get("/", authenticateToken, isEditorOrAdmin, getRooms);

// ➕ Створення нової кімнати - тільки для admin
// POST /rooms
router.post("/", authenticateToken, isAdmin, createRoom);

// ✏️ Повне редагування кімнати (wifi, capacity, і т.д.)
router.put(
  "/number/:roomNumber",
  authenticateToken,
  isEditorOrAdmin,
  updateRoom
);

// 🔄 Ручний зміна тільки статусу (залишимо, якщо треба) — admin/editor (free/booked/occupied)
router.put(
  "/number/:roomNumber/status",
  authenticateToken,
  isEditorOrAdmin,
  updateRoomStatus
);

// ❌ Видалення кімнати
// DELETE /rooms/number/:roomNumber
// (тільки для admin)
router.delete("/number/:roomNumber", authenticateToken, isAdmin, deleteRoom);

// ➕➕➕ Room Availability Routes ➕➕➕

//GET /rooms/number/101/availability?from=2025-08-20&to=2025-08-25
// Availability: одинична кімната
router.get(
  "/number/:roomNumber/availability",
  authenticateToken,
  isEditorOrAdmin,
  getRoomAvailability
);

// GET /rooms/availability?from=2025-08-20&to=2025-08-25[&details=1]
// Availability: всі кімнати поточного адміна
router.get(
  "/availability",
  authenticateToken,
  isEditorOrAdmin,
  getAvailabilityForAllRooms
);

// ➕➕➕ Room Stats Routes Доп. dashboard в середині /rooms➕➕➕

// Статистика по кімнатам (весь готель: free/booked/occupied)
// GET /rooms/stats
router.get("/stats", authenticateToken, isEditorOrAdmin, getRoomStats);

export default router;
