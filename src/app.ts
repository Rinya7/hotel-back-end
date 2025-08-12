import express from "express";
import { json } from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import roomRoutes from "./routes/roomRoutes";
import stayRoutes from "./routes/stayRoutes";

dotenv.config(); // зчитує змінні з .env

const app = express();

app.use(json()); // дозволяє читати JSON в тілі запитів

// Додамо тимчасовий базовий маршрут
app.get("/", (_req, res) => {
  res.send("Hotel backend is running!");
});

app.use("/auth", authRoutes);
app.use("/rooms", roomRoutes);
app.use("/rooms", stayRoutes);

export default app;
