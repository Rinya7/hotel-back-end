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

// ------------------------------------------------------------
// 0) Trust proxy (для правильної роботи з Nginx reverse proxy)
// ------------------------------------------------------------
app.set("trust proxy", 1);

// ------------------------------------------------------------
// 1) Безпека
// ------------------------------------------------------------
app.use(helmet());

// ------------------------------------------------------------
// 2) CORS — правильний порядок, чітко визначені домени
// ------------------------------------------------------------
const allowedOrigins: string[] = [
  "http://localhost:5173",        // admin local
  "http://localhost:5174",        // guest local
  "https://admin.hotel-lotse.app",
  "https://guest.hotel-lotse.app",
  "https://hotel-lotse.app",
  "https://api.hotel-lotse.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// ------------------------------------------------------------
// 3) JSON parser
// ------------------------------------------------------------
app.use(express.json());

// ------------------------------------------------------------
// 4) Rate Limits
// ------------------------------------------------------------
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: Request) => {
      const ip = req.ip || "";
      return ip.includes("127.0.0.1") || ip.includes("::1");
    },
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

// ------------------------------------------------------------
// 5) Тест і healthcheck — ДО валідатора
// ------------------------------------------------------------
app.get("/", (_req, res) => {
  res.send("Hotel backend is running!");
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// ------------------------------------------------------------
// 6) Swagger – ДО валідатора
// ------------------------------------------------------------
setupSwagger(app);

// ------------------------------------------------------------
// 7) OpenAPI Validator — після Swagger, ДО маршрутів
// ------------------------------------------------------------
setupOpenApiValidator(app);

// ------------------------------------------------------------
// 8) Обробка помилок OpenAPI
// ------------------------------------------------------------
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.status === 400 && err.errors) {
    console.error(
      "[OpenAPI Validator] Validation error:",
      JSON.stringify(err.errors, null, 2)
    );
    return res.status(400).json({
      message: "Validation error",
      errors: err.errors,
    });
  }
  next(err);
});

// ------------------------------------------------------------
// 9) ВСІ РОУТИ — після валідатора
// ------------------------------------------------------------
app.use("/auth", authRoutes);
app.use("/rooms", roomRoutes);
app.use("/rooms", roomStay);
app.use("/stays", staysRoutes);
app.use("/audit", auditRoutes);
app.use("/guest", guestRoutes);
app.use(roomPolicyRoutes);

export default app;
