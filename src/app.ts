// src/app.ts
import express, { Request, Response, NextFunction } from "express";
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

// CORS конфігурація з динамічною перевіркою origin
//const allowedOrigins: string[] =
//  process.env.NODE_ENV === "production"
//    ? ["https://admin.hotel-lotse.app", "https://hotel-lotse.app"]
//    : ["http://localhost:5173", "http://localhost:5174"];
    const allowedOrigins: string[] = [
        "http://localhost:5173",          // admin local
  "http://localhost:5174",          // guest local
  "https://admin.hotel-lotse.app",  // admin prod
  "https://guest.hotel-lotse.app",  // guest prod
  "https://api.hotel-lotse.app",    // якщо будеш тикати API прямо
  "https://hotel-lotse.app",        // на майбутнє, якщо буде маркетинговий фронт, що стукає в API
      ];
app.use(
  cors({
    origin: (origin, callback) => {
      // Дозволяємо запити без origin (наприклад, Postman, curl)
      if (!origin) {
        return callback(null, true);
      }
      // Перевіряємо, чи origin в списку дозволених
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Блокуємо всі інші origins
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());

// Rate Limit Global
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 300, // максимум 300 запросов за 15 минут
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: Request) => {
      // Пропускаем rate limit для localhost (разработка)
      const ip = req.ip || "";
      return ip.includes("127.0.0.1") || ip.includes("::1");
    },
  })
);

// Rate Limit Login
app.use(
  "/auth/login",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Test route (також використовується для healthcheck)
app.get("/", (_req, res) => {
  res.send("Hotel backend is running!");
});

// Health check endpoint для Docker/K8s
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
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
// OpenAPI Validator (after Swagger)
setupOpenApiValidator(app); // валідатор читає файл сам

// Обробка помилок валідації OpenAPI
// Validator error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.status === 400 && err.errors) {
    console.error("[OpenAPI Validator] Validation error:", JSON.stringify(err.errors, null, 2));
    return res.status(400).json({
      message: "Validation error",
      errors: err.errors,
    });
  }
  next(err);
});

// ===== Routes (після валідатора) =====
app.use("/auth", authRoutes);
app.use("/rooms", roomRoutes);
app.use("/rooms", roomStay);
app.use("/stays", staysRoutes);
app.use("/audit", auditRoutes);
app.use("/guest", guestRoutes);
app.use(roomPolicyRoutes);

export default app;
