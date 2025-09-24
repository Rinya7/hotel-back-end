// src/utils/policy.ts
// English: central helpers for policy hours and date composition.

import { DateTime } from "luxon";
import { Room } from "../entities/Room";
import { Admin } from "../entities/Admin";
import {
  APP_TIMEZONE,
  DEFAULT_CHECKIN_HOUR,
  DEFAULT_CHECKOUT_HOUR,
  CRON_TOLERANCE_SECONDS,
} from "../config/time";

/**
 * Validate hour in range 0..23
 */
function isValidHour(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 23;
}

/**
 * Policy precedence: Room → Admin → global defaults.
 */
export function policyHoursFor(room: Room): {
  inHour: number;
  outHour: number;
} {
  if (isValidHour(room.checkInHour) && isValidHour(room.checkOutHour)) {
    return { inHour: room.checkInHour, outHour: room.checkOutHour };
  }
  const admin: Admin | undefined = room.admin;
  if (
    admin &&
    isValidHour(admin.checkInHour) &&
    isValidHour(admin.checkOutHour)
  ) {
    return { inHour: admin.checkInHour, outHour: admin.checkOutHour };
  }
  return { inHour: DEFAULT_CHECKIN_HOUR, outHour: DEFAULT_CHECKOUT_HOUR };
}

/** Compose a local Luxon DateTime from DATE-only + hour in APP_TIMEZONE. */
export function makeLocalDateTime(
  dateOnly: Date,
  hour: number,
  minute = 0,
  second = 0
): DateTime {
  // DATE из БД приходит как "полночь UTC". Берём UTC-геттеры, чтобы избежать сдвигов.
  const js = new Date(dateOnly);
  const y = js.getUTCFullYear();
  const m = js.getUTCMonth() + 1;
  const d = js.getUTCDate();

  return DateTime.fromObject(
    { year: y, month: m, day: d, hour, minute, second },
    { zone: APP_TIMEZONE }
  );
}

/**
 * Return current time and tolerance window.
 * "now" = current DateTime in APP_TIMEZONE.
 * "earliest" = now - CRON_TOLERANCE_SECONDS (e.g., 59s back).
 *
 * Purpose: avoid missing exact boundary conditions in cron.
 */
export function nowWithTolerance(): { now: DateTime; earliest: DateTime } {
  const now = DateTime.now().setZone(APP_TIMEZONE);
  const earliest = now.minus({ seconds: CRON_TOLERANCE_SECONDS });
  return { now, earliest };
}
