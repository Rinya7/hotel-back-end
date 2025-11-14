// src/app.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth.routes";
import roomRoutes from "./routes/roomRoutes";
import roomStay from "./routes/roomStay";
import staysRoutes from "./routes/stayRoutes";
import roomPolicyRoutes from "./routes/roomPolicy.routes";
import auditRoutes from "./routes/audit.routes";
import guestRoutes from "./routes/guest.routes";

import { setupSwagger } from "./config/swagger";
import { setupOpenApiValidator } from "./config/openapi-validator";

const app = express();

// Безпека/базові мідлвари
app.use(helmet());
app.use(cors({ origin: ["http://localhost:5173"], credentials: true }));
app.use(express.json());

// Rate limits
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);
app.use(
  "/auth/login",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/", (_req, res) => {
  res.send("Hotel backend is running!");
});

/**
 * 1) Спочатку монтуємо Swagger UI + /docs.json
 *    — щоб їх не блокував валідатор.
 */
const openapiDoc = setupSwagger(app); // це тільки для UI/JSON

/**
 * 2) Далі підключаємо валідатор, який буде перевіряти
 *    усі запити/відповіді згідно openapi.yaml,
 *    але ігнорувати /docs та /docs.json (див. ignorePaths).
 */
setupOpenApiValidator(app); // валідатор читає файл сам

// ===== Routes (після валідатора) =====
app.use("/auth", authRoutes);
app.use("/rooms", roomRoutes);
app.use("/rooms", roomStay);
app.use("/stays", staysRoutes);
app.use("/audit", auditRoutes);
app.use("/guest", guestRoutes);
app.use(roomPolicyRoutes);

export default app;
