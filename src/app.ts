// src/app.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth.routes";
import roomRoutes from "./routes/roomRoutes";
import roomStay from "./routes/roomStay"; // ⬅️ new
import staysRoutes from "./routes/stayRoutes"; // ⬅️ new

import roomPolicyRoutes from "./routes/roomPolicy.routes";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);

app.use(express.json());

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

// ===== Routes =====
app.use("/auth", authRoutes);

// Rooms: CRUD, status, stats, availability, room-level stays nested
app.use("/rooms", roomRoutes);
app.use("/rooms", roomStay);

// Stays: global lists + manual ops by stayId
app.use("/stays", staysRoutes);

// Bulk policy-hours for rooms (keep if you use mass update of check-in/out hours)
app.use(roomPolicyRoutes);

export default app;
