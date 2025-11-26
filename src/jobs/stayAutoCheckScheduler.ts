// src/jobs/stayAutoCheckScheduler.ts
// Scheduler для автоматичної перевірки просрочених stays.
// Виконується щодня о 03:00 за часом готелю.

import cron, { ScheduledTask } from "node-cron";
import { StayAutoCheckService } from "../services/cron/stayAutoCheck.service";
import { APP_TIMEZONE } from "../config/time";

// CRON вираз: щодня о 03:00 (0 3 * * *)
const CRON_EXPR: string = process.env.STAY_AUTO_CHECK_CRON ?? "0 3 * * *";

// Auto-start flag
const AUTO_START: boolean =
  (process.env.STAY_AUTO_CHECK_AUTO_START ?? "true") === "true";

let task: ScheduledTask | null = null;
let isRunning = false;

/**
 * Створює та запускає cron job для автоматичної перевірки просрочених stays.
 * Виконується щодня о 03:00 за часом готелю.
 */
export function startStayAutoCheckScheduler(): void {
  if (task) return; // idempotent: вже створено

  const service = new StayAutoCheckService();

  task = cron.schedule(
    CRON_EXPR,
    async () => {
      // Запобігаємо паралельному виконанню
      if (isRunning) {
        console.log("[StayAutoCheckScheduler] Previous check still running, skipping");
        return;
      }
      isRunning = true;
      try {
        await service.checkOverdueStays();
      } catch (err) {
        console.error("[StayAutoCheckScheduler] Check FAILED:", err);
      } finally {
        isRunning = false;
      }
    },
    {
      timezone: APP_TIMEZONE,
    }
  );

  if (!AUTO_START) {
    task.stop();
    console.log(
      `[StayAutoCheckScheduler] Created but not started (STAY_AUTO_CHECK_AUTO_START=false). Cron: ${CRON_EXPR}`
    );
  } else {
    task.start();
    console.log(
      `[StayAutoCheckScheduler] Started. Cron: ${CRON_EXPR}, Timezone: ${APP_TIMEZONE}`
    );
  }
}

/**
 * Зупиняє cron job (для graceful shutdown або паузи).
 */
export function stopStayAutoCheckScheduler(): void {
  if (!task) return;
  task.stop();
  task = null;
  console.log("[StayAutoCheckScheduler] Stopped");
}

/**
 * Продовжує виконання cron job після паузи.
 */
export function resumeStayAutoCheckScheduler(): void {
  if (!task) return;
  task.start();
  console.log("[StayAutoCheckScheduler] Resumed");
}

