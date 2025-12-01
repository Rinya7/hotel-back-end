// src/index.ts
// 1) TypeORM needs reflect-metadata to read TS types from decorators.
import "reflect-metadata";

// 2) Load .env before anything else that might read process.env
import * as dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { AppDataSource } from "./config/data-source";
// ОТКЛЮЧЕНО: StatusScheduler більше не використовується (повністю ручна модель статусів)
// import {
//   startStatusScheduler,
//   stopStatusScheduler,
// } from "./jobs/statusScheduler";
import {
  startStayAutoCheckScheduler,
  stopStayAutoCheckScheduler,
} from "./jobs/stayAutoCheckScheduler";

// Port must be a number. Fallback to 3000.
const PORT: number = Number(process.env.PORT ?? 3000);

// Optional flags (handy in CI/preview environments)
const RUN_MIGRATIONS: boolean =
  (process.env.RUN_MIGRATIONS ?? "true") === "true";
const START_SCHEDULER: boolean =
  (process.env.START_SCHEDULER ?? "true") === "true";

/**
 * Bootstrap sequence:
 * 1) Initialize DB connection
 * 2) Run pending migrations (optional, controlled by RUN_MIGRATIONS)
 * 3) Start background scheduler (optional, controlled by START_SCHEDULER)
 * 4) Start HTTP server
 * 5) Wire graceful shutdown + global error handlers
 */
async function bootstrap(): Promise<void> {
  try {
    // --- 0) Pre-flight sanity checks (fail fast with clear messages) ---
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not set. Please configure it in .env");
    }

    // --- 1) DB connection ---
    await AppDataSource.initialize();
    console.log("📦 Connected to the database");

    // --- 2) Migrations ---
    if (RUN_MIGRATIONS) {
      await AppDataSource.runMigrations();
      console.log("🧱 Migrations are up to date");
    } else {
      console.log("⏭️  RUN_MIGRATIONS=false — skipping migrations");
    }

    // --- 3) Scheduler ---
    // ВАЖЛИВО: Ми використовуємо повністю РУЧНУ модель статусів (Variant A).
    // Статуси Room/Stay змінюються ТІЛЬКИ через ручні endpoints (check-in, check-out, set cleaning, etc.).
    // 
    // ОТКЛЮЧЕНО: startStatusScheduler() - автоматична зміна статусів через StatusService.tick()
    // Це було видалено, оскільки воно автоматично міняло:
    //   - Stay.status (booked → occupied, occupied → completed)
    //   - Room.status (occupied → free, free → occupied, cleaning і т.д.)
    //   на основі дат/політик часу, що конфліктувало з ручною моделлю.
    //
    // ЗАЛИШАЄМО: startStayAutoCheckScheduler() - автоматична перевірка просрочених stays
    // Цей сервіс ТІЛЬКИ встановлює needsAction=true для stays, які потребують дії,
    // але НЕ змінює статуси Room/Stay.
    if (START_SCHEDULER) {
      // startStatusScheduler(); // ОТКЛЮЧЕНО - автоматична зміна статусів більше не використовується
      // console.log("⏱️  Status scheduler started");
      
      startStayAutoCheckScheduler(); // автоматична перевірка просрочених stays (тільки needsAction)
      console.log("⏱️  Stay auto-check scheduler started (needsAction only, no status changes)");
    } else {
      console.log("⏭️  START_SCHEDULER=false — scheduler not started");
    }

    // --- 4) HTTP server ---
    const server = app.listen(PORT, () => {
      const baseUrl = process.env.BASE_URL ?? `http://localhost:${PORT}`;
      console.log(`🚀 Server is running at ${baseUrl}`);
    });

    // --- 5) Graceful shutdown ---
    const shutdown = async (signal: string) => {
      try {
        console.log(`\n⚙️  Received ${signal}, shutting down gracefully...`);

        // Stop cron first (so no new DB work enters while we are closing)
        try {
          // stopStatusScheduler(); // ОТКЛЮЧЕНО - scheduler більше не використовується
          // console.log("⏹️  Status scheduler stopped");
          
          stopStayAutoCheckScheduler();
          console.log("⏹️  Stay auto-check scheduler stopped");
        } catch (e) {
          console.warn("⚠️  Failed to stop scheduler (non-critical):", e);
        }

        // Close HTTP server to stop accepting new connections
        await new Promise<void>((resolve, reject) => {
          server.close((err) => (err ? reject(err) : resolve()));
        });
        console.log("🛑 HTTP server closed");

        // Close DB
        await AppDataSource.destroy();
        console.log("🔌 DB connection closed");

        process.exit(0);
      } catch (e) {
        console.error("❌ Error during shutdown:", e);
        process.exit(1);
      }
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

    // --- 6) Global error handlers (as a last line of defense) ---
    process.on("unhandledRejection", (reason) => {
      console.error("💥 Unhandled Promise Rejection:", reason);
    });
    process.on("uncaughtException", (err) => {
      console.error("💥 Uncaught Exception:", err);
      // optional: decide whether to exit(1)
    });
  } catch (error) {
    console.error("❌ Error bootstrapping the app:", error);
    // If DataSource partially initialized, try to close it to avoid leaked connections.
    try {
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }
    } catch (e) {
      console.warn("⚠️  Failed to close DataSource during bootstrap error:", e);
    }
    process.exit(1);
  }
}

bootstrap();
