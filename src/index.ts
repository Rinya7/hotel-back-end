import * as dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { AppDataSource } from "./config/data-source";
import { startStatusScheduler } from "./jobs/statusScheduler";

const PORT = process.env.PORT || 3000;

// Підключення до бази + старт сервера
/**
 * Bootstrap sequence:
 * 1) Initialize DB connection
 * 2) Run pending migrations (ensures schema is up to date)
 * 3) Start background scheduler (status auto-switch)
 * 4) Start HTTP server
 */
async function bootstrap(): Promise<void> {
  try {
    await AppDataSource.initialize();
    console.log("📦 Connected to the database");

    // Ensure DB schema is up-to-date (safe to run at startup)
    await AppDataSource.runMigrations();
    console.log("🧱 Migrations are up to date");

    // Start cron-based status updater AFTER DB is ready
    startStatusScheduler();
    console.log("⏱️ Status scheduler started");

    app.listen(PORT, () => {
      console.log(`🚀 Server is running at http://localhost:${PORT}`);
    });

    // Optional: graceful shutdown hooks (CTRL+C, docker stop, etc.)
    const shutdown = async (signal: string) => {
      try {
        console.log(`\n⚙️  Received ${signal}, shutting down gracefully...`);
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
  } catch (error) {
    console.error("❌ Error bootstrapping the app:", error);
    process.exit(1);
  }
}

bootstrap();
