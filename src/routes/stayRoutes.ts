// routes/stayRoutes.ts
import { Router } from "express";
import {
  getCurrentStays,
  createStayForRoom,
  updateStayByDates,
  closeStay,
  getStaysForRoom,
} from "../controllers/stayController";
import {
  authenticateToken,
  isEditorOrAdmin, // admin + editor
  isAdmin, // только admin (на будущее для delete)
} from "../middlewares/authMiddleware";

const router = Router();

// Поточні броні/заселення по всьому готелю (для dashboard)
// (всі активні Stay, які не completed/cancelled)
// GET /rooms/stays/current
router.get(
  "/stays/current",
  authenticateToken,
  isEditorOrAdmin,
  getCurrentStays
);

// Створення броні/заселення по кімнаті
// POST /rooms/number/:roomNumber/stays
router.post(
  "/number/:roomNumber/stays",
  authenticateToken,
  isEditorOrAdmin,
  createStayForRoom
);

// 📜 Історія по конкретній кімнаті (опціонально ?from=YYYY-MM-DD&to=YYYY-MM-DD)
// GET /rooms/number/:roomNumber/stays
router.get(
  "/number/:roomNumber/stays",
  authenticateToken,
  isEditorOrAdmin,
  getStaysForRoom
);

// ✏️  Редагування броні/заселення (по вихідним checkIn/checkOut)
// PUT /room/:roomNumber
// (для адміна/editor)
// PUT /rooms/number/:roomNumber/stays
router.put(
  "/number/:roomNumber/stays",
  authenticateToken,
  isEditorOrAdmin,
  updateStayByDates
);

// ❌ Закрити (completed) / відмінити (cancelled)
// PUT /rooms/number/:roomNumber/stays/close
router.put(
  "/number/:roomNumber/stays/close",
  authenticateToken,
  isEditorOrAdmin,
  closeStay
);

// Если когда‑нибудь понадобится удаление Stay — лучше только admin
// router.delete(
//   "/rooms/number/:roomNumber/stays",
//   authenticateToken,
//   isAdmin,
//   deleteStayByDates
// );

export default router;
