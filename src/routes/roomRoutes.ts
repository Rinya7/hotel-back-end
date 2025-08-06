import { Router } from "express";
import {
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
} from "../middlewares/authMiddleware";

const router = Router();

// 🔓 Перегляд усіх кімнат
router.get("/", authenticateToken, isAdmin, getRooms);

// ➕ Створення нової кімнати
router.post("/", authenticateToken, isAdmin, createRoom);

// ✏️ Повне редагування кімнати (wifi, capacity, і т.д.)
router.put("/:id", authenticateToken, isAdmin, updateRoom);

// 🔄 Оновлення тільки статусу (free/booked/occupied)
router.put("/:id/status", authenticateToken, isEditorOrAdmin, updateRoomStatus);

// ❌ Видалення кімнати
router.delete("/:id", authenticateToken, isAdmin, deleteRoom);

export default router;
