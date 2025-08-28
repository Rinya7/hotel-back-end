// src/app.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth.routes";
import roomRoutes from "./routes/roomRoutes";
import stayRoutes from "./routes/stayRoutes";

import roomPolicyRoutes from "./routes/roomPolicy.routes";

const app = express();
// если когда-то будет прокси (nginx), это оставить
// app.set("trust proxy", 1);

// Безопасные заголовки
app.use(helmet());

// CORS — в DEV можно origin: true; ниже пример под Vite фронт
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);

// JSON body parser
app.use(express.json());

// Общий лимит запросов, чтобы не долбили API
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 300, // 300 запросов/IP
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Более строгий лимит только на логин
app.use(
  "/auth/login",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Базовый маршрут (проверка, что жив)
app.get("/", (_req, res) => {
  res.send("Hotel backend is running!");
});

// Маршруты
app.use("/auth", authRoutes);
app.use("/rooms", roomRoutes);
app.use("/rooms", stayRoutes);

app.use(roomPolicyRoutes);

export default app;
