// src/routes/auth.routes.ts
import { Router } from "express";
import {
  createAdminBySuperadmin,
  getUsers,
  getProfile,
  loginAdmin,
  createEditorAdmin,
  deleteAdminOrEditor,
  blockAdmin,
  unblockAdmin,
  blockEditor,
  unblockEditor,
  updateEditor,
  updateAdminHotelProfile,
} from "../controllers/auth.controller";

import {
  authenticateToken,
  isAdmin,
  isSuperadmin,
} from "../middlewares/authMiddleware";

const router = Router();

// 🔓 Вхід
router.post("/login", loginAdmin);

// 🔐 Створення адміна — тільки для superadmin
router.post(
  "/create-admin",
  authenticateToken,
  isSuperadmin,
  createAdminBySuperadmin
);

// 🔧 PUT /auth/admin/:username — редагує супер-адмін
router.put(
  "/admin/:username",
  authenticateToken,
  isSuperadmin,
  updateAdminHotelProfile
);

// 🔐 Створення редактора — тільки для admin
router.post("/create-editor", authenticateToken, isAdmin, createEditorAdmin);
// 🔐 Перегляд створених користувачів superadmin бачив усіх admin + їх editor'ів або admin бачив лише своїх editor'ів
router.get("/users", authenticateToken, getUsers);
// 🔐 Получить информацию о текущем админе (профиль + редакторы)
router.get("/profile", authenticateToken, getProfile);
// 🔐 Блокування/розблокування адмінів — тільки для superadmin
router.put("/block/:username", authenticateToken, isSuperadmin, blockAdmin);
router.put("/unblock/:username", authenticateToken, isSuperadmin, unblockAdmin);
// 🔐 Блокувание/разблокирование редакторов — для admin (только своих редакторов)
router.put("/editor/:username/block", authenticateToken, isAdmin, blockEditor);
router.put("/editor/:username/unblock", authenticateToken, isAdmin, unblockEditor);
// 🔧 Редактирование редактора — для admin (только своих редакторов)
router.put("/editor/:username", authenticateToken, isAdmin, updateEditor);

// ❌ Видалення користувача (admin → себе/редакторів; superadmin → будь-кого)
router.delete("/delete/:username", authenticateToken, deleteAdminOrEditor);

export default router;
