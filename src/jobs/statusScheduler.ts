// src/jobs/statusScheduler.ts
// 
// ⚠️ ВАЖЛИВО: Цей scheduler ОТКЛЮЧЕНО в рамках переходу на повністю РУЧНУ модель статусів (Variant A).
//
// РАНІШЕ (до відключення):
//   - Запускав StatusService.tick() кожні 30 секунд (або за CRON виразом з env)
//   - StatusService автоматично змінював статуси Stay/Room на основі дат/політик часу
//
// ЗАРАЗ:
//   - startStatusScheduler() більше НЕ викликається в index.ts
//   - Всі зміни статусів Room/Stay виконуються ТІЛЬКИ вручну через контролери
//   - Єдиний активний cron - StayAutoCheckScheduler (тільки needsAction, без зміни статусів)
//
// Цей файл залишено для історичної довідки, але функції більше не використовуються.
// Якщо потрібно повністю видалити цей код - можна зробити це пізніше.
//
// Purpose: schedule StatusService.tick() on a fixed interval. [ОТКЛЮЧЕНО]
// Features:
//  - Controlled by env flags: STATUS_CRON, STATUS_AUTO_START [ОТКЛЮЧЕНО]
//  - Idempotent start (no duplicate jobs) [ОТКЛЮЧЕНО]
//  - Stop/resume for runtime control (graceful shutdown support) [ОТКЛЮЧЕНО]
//  - Timezone-aware (APP_TIMEZONE) [ОТКЛЮЧЕНО]
//  - No overlapping ticks (skip if previous tick still running) [ОТКЛЮЧЕНО]

import cron, { ScheduledTask } from "node-cron";
import { StatusService } from "../services/statusService";
import { APP_TIMEZONE } from "../config/time";

// CRON cadence from env. 6-field with seconds is supported by node-cron.
// Examples:
//   "*/30 * * * * *" -> every 30 seconds
//   "* * * * *"      -> every minute
const CRON_EXPR: string = process.env.STATUS_CRON ?? "*/30 * * * * *";

// Auto-start flag for the task itself (inside module).
// If false -> task is created but immediately stopped; you can resume later.
const AUTO_START: boolean =
  (process.env.STATUS_AUTO_START ?? "true") === "true";

let task: ScheduledTask | null = null;
let isTickRunning = false;

/** Create the task if not exists and (optionally) auto-start it. */
export function startStatusScheduler(): void {
  if (task) return; // idempotent: already created

  const service = new StatusService();

  task = cron.schedule(
    CRON_EXPR,
    async () => {
      // Prevent overlapping ticks: if previous still running, skip this one.
      if (isTickRunning) return;
      isTickRunning = true;
      try {
        await service.tick();
      } catch (err) {
        console.error("[statusScheduler] tick FAILED:", err);
      } finally {
        isTickRunning = false;
      }
    },
    {
      timezone: APP_TIMEZONE, // e.g., "Europe/Rome"
      // Some node-cron versions support "scheduled:false" here, but typings may differ.
      // We keep compatibility: we'll stop() below if AUTO_START=false.
    }
  );

  // Explicitly control auto-start compatible with older typings:
  if (!AUTO_START) {
    task.stop(); // created but not running; can be started later by resumeStatusScheduler()
  } else {
    // In most versions schedule() auto-starts; calling start() is harmless (idempotent).
    task.start();
  }
}

/** Stop the task (use in graceful shutdown or to pause the scheduler). */
export function stopStatusScheduler(): void {
  if (!task) return;
  try {
    task.stop();
    task.destroy();
  } finally {
    task = null;
    isTickRunning = false;
  }
}

/** Resume the task if it was created and currently stopped. */
export function resumeStatusScheduler(): void {
  if ((task && !task.getStatus?.()) || task) {
    // Some versions do not expose getStatus(); simply try start():
    try {
      task.start();
    } catch (e) {
      console.warn("[statusScheduler] resume failed:", e);
    }
  }
}

/** Is the scheduler active (task exists and is running)? */
export function isStatusSchedulerRunning(): boolean {
  // Not all node-cron versions have getStatus(); we infer from internal flag and task presence.
  // If your version has getStatus(), you can return task?.getStatus() === "scheduled".
  return Boolean(task); // minimal check: created implies running if AUTO_START=true and not stopped
}
