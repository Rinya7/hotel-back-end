// src/utils/hours.ts
// English comments: strict guards for hour values and their nullable/optional variants.

/** True if v is an integer hour in the inclusive range [0..23]. */
export function isHour(v: unknown): v is number {
  return Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 23;
}

/**
 * True if v is null OR a valid hour [0..23].
 * Use this when API allows explicit null to mean "follow hotel defaults".
 */
export function isHourOrNull(v: unknown): v is number | null {
  return v === null || isHour(v);
}

/**
 * True if v is undefined OR a valid hour [0..23].
 * Use this when a field is optional in the payload (omitted → do not touch).
 */
export function isHourOptional(v: unknown): v is number | undefined {
  return typeof v === "undefined" || isHour(v);
}
