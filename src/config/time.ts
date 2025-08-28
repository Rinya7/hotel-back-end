//# Налаштування часової зони та константи check-in/out за замовчуванням
// src/config/time.ts
// Purpose: single place to configure timezone-sensitive behavior and defaults.
// Comments in English as requested.

export const APP_TIMEZONE: string = process.env.TZ ?? "Europe/Rome";

/**
 * Some hotels do not store check-in/check-out times per stay and rely on default hotel policy.
 * If your Stay already has precise times in checkIn/checkOut, you DO NOT need these defaults.
 * Keep them here for fallback or validation purposes.
 */
export const DEFAULT_CHECKIN_HOUR: number = 14; // 14:00 local time
export const DEFAULT_CHECKOUT_HOUR: number = 10; // 10:00 local time

/**
 * Safety window for cron granularity.
 * Example: if cron runs once per minute, we can treat [now - 59s, now] as "now"
 * to avoid missing an exact boundary because of scheduler drift.
 */
export const CRON_TOLERANCE_SECONDS: number = 59;
