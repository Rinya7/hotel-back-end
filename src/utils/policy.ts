// src/utils/policy.ts
// English: central helpers for policy hours and date composition.

import { DateTime } from "luxon";
import { Room } from "../entities/Room";
import { Admin } from "../entities/Admin";
import {
  APP_TIMEZONE,
  DEFAULT_CHECKIN_HOUR,
  DEFAULT_CHECKOUT_HOUR,
} from "../config/time";

/** Return policy hours with precedence: Room → Admin → global defaults. */
export function policyHoursFor(room: Room): {
  inHour: number;
  outHour: number;
} {
  if (
    Number.isInteger(room.checkInHour) &&
    Number.isInteger(room.checkOutHour)
  ) {
    return {
      inHour: room.checkInHour as number,
      outHour: room.checkOutHour as number,
    };
  }
  const admin: Admin | undefined = room.admin;
  if (
    admin &&
    Number.isInteger(admin.checkInHour) &&
    Number.isInteger(admin.checkOutHour)
  ) {
    return {
      inHour: admin.checkInHour as number,
      outHour: admin.checkOutHour as number,
    };
  }
  return { inHour: DEFAULT_CHECKIN_HOUR, outHour: DEFAULT_CHECKOUT_HOUR };
}

/** Compose a local DateTime from a DATE-only column + local hour in APP_TIMEZONE. */
export function makeLocalDateTime(dateOnly: Date, hour: number): DateTime {
  const js = new Date(dateOnly);
  const y = js.getUTCFullYear();
  const m = js.getUTCMonth() + 1;
  const d = js.getUTCDate();
  return DateTime.fromObject(
    { year: y, month: m, day: d, hour },
    { zone: APP_TIMEZONE }
  );
}
