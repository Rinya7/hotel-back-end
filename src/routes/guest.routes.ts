// src/routes/guest.routes.ts

import { Router } from "express";
import { GuestController } from "../controllers/guest.controller";
import { AppDataSource } from "../config/data-source";
import {
  authenticateToken,
  isEditorOrAdmin,
} from "../middlewares/authMiddleware";

const router = Router();

// Створюємо інстанс контролера з переданим dataSource
const controller = new GuestController(AppDataSource);

/**
 * POST /guest/stays/:stayId/link
 * Створення/отримання лінку для гостя (тільки admin/editor)
 */
router.post(
  "/stays/:stayId/link",
  authenticateToken,
  isEditorOrAdmin,
  controller.createGuestAccessLink
);

/**
 * GET /guest/access/:token
 * Публічний ендпоінт для гостя по токену (без auth, тільки токен)
 */
router.get("/access/:token", controller.getGuestAccessByToken);

export default router;
