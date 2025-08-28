//Планувальник (cron) — коли та як часто запускати
// src/jobs/statusScheduler.ts
// Purpose: run our StatusService.tick() on a fixed schedule.
// We use node-cron for readability. You can replace with Bull, Agenda, or pg_cron later.

import cron from "node-cron";
import { StatusService } from "../services/statusService";

/**
 * Start the cron that promotes/demotes stay & room statuses.
 * Runs every minute. Adjust to your needs.
 */
export function startStatusScheduler(): void {
  const service = new StatusService();

  // “* * * * *” means every minute (at second ~0). If you want every 30s, you need setInterval or another lib.
  cron.schedule("* * * * *", async () => {
    try {
      await service.tick();
      // Optional: minimal logging
      // console.log("[statusScheduler] tick OK");
    } catch (err) {
      console.error("[statusScheduler] tick FAILED:", err);
    }
  });
}
