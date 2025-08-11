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
import {
  createStayForRoom,
  getStaysForRoom,
} from "../controllers/stayController";
import {
  getAvailabilityForAllRooms,
  getRoomAvailability,
} from "../controllers/roomAvailabilityController";

const router = Router();
// 🔓 Перегляд усіх кімнат по всій системі для superadmina
router.get("/all", authenticateToken, isSuperadmin, getAllRooms);
// 🔓 Перегляд усіх кімнат в готелі
router.get("/", authenticateToken, isEditorOrAdmin, getRooms);

// ➕ Створення нової кімнати
router.post("/", authenticateToken, isAdmin, createRoom);

// ✏️ Повне редагування кімнати (wifi, capacity, і т.д.)
router.put(
  "/number/:roomNumber",
  authenticateToken,
  isEditorOrAdmin,
  updateRoom
);

// 🔄 Оновлення тільки статусу (free/booked/occupied)
router.put(
  "/number/:roomNumber/status",
  authenticateToken,
  isEditorOrAdmin,
  updateRoomStatus
);

// ❌ Видалення кімнати
router.delete("/number/:roomNumber", authenticateToken, isAdmin, deleteRoom);

// ➕➕➕ Stay Routes ➕➕➕

//  створити бронювання/заселення в кімнаті
router.post(
  "/number/:roomNumber/stays",
  authenticateToken,
  isEditorOrAdmin,
  createStayForRoom
);

// список проживань по кімнаті
router.get(
  "/number/:roomNumber/stays",
  authenticateToken,
  isEditorOrAdmin,
  getStaysForRoom
);

//GET /rooms/number/101/availability?from=2025-08-20&to=2025-08-25
// Availability: одинична кімната

router.get(
  "/number/:roomNumber/availability",
  authenticateToken,
  isEditorOrAdmin,
  getRoomAvailability
);

// Availability: всі кімнати (для дошки)
router.get(
  "/availability",
  authenticateToken,
  isEditorOrAdmin,
  getAvailabilityForAllRooms
);

export default router;
