/**
 * Date utility functions for consistent date handling across the application.
 * All dates are normalized to YYYY-MM-DD format (ISO 8601 date-only) using UTC to avoid timezone issues.
 */

/**
 * Normalizes a date input to YYYY-MM-DD format (UTC).
 * Handles both string and Date inputs.
 *
 * @param input - A date string (e.g., "2026-12-25", "2026-12-25T14:30:00.000Z") or a Date object
 * @returns YYYY-MM-DD formatted string in UTC
 *
 * @example
 * normalizeToDate(new Date("2026-12-25T14:30:00.000Z")) // "2026-12-25"
 * normalizeToDate("2026-12-25")                         // "2026-12-25"
 * normalizeToDate("2026-12-25T23:59:59.999Z"))         // "2026-12-25"
 */
export function normalizeToDate(input: string | Date): string {
  if (typeof input === "string") {
    // Parse the string and convert to UTC midnight
    const date = new Date(input);
    return date.toISOString().split("T")[0];
  }
  // For Date objects, use toISOString which is always UTC
  return input.toISOString().split("T")[0];
}
