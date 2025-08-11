import { Router } from "express";
import {
  authenticateToken,
  isEditorOrAdmin,
} from "../middlewares/authMiddleware";
import {
  getAllStaysForHotel,
  updateStayStatus,
} from "../controllers/stayController";

const router = Router();
//Получить список всех проживаний для своего отеля
router.get(
  "/all/booked",
  authenticateToken,
  isEditorOrAdmin,
  getAllStaysForHotel
);

// змінити статус конкретного stay
router.put("/:id/status", authenticateToken, isEditorOrAdmin, updateStayStatus);

export default router;
