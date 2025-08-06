import { Router } from "express";
import {
  loginAdmin,
  registerAdmin,
  createEditorAdmin,
} from "../controllers/auth.controller";

import { authenticateToken, isAdmin } from "../middlewares/authMiddleware";

const router = Router();

router.post("/register", registerAdmin); // створення головного адміна
router.post("/login", loginAdmin); // вхід
router.post("/create-editor", authenticateToken, isAdmin, createEditorAdmin); // 👈 створення editor

export default router;
