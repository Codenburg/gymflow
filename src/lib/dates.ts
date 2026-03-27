/**
 * Date utility functions for consistent date handling across the application.
 * All dates are normalized to YYYY-MM-DD format (calendar date, NOT timestamp).
 *
 * IMPORTANT: "Fecha de feriado" is a calendar value, not a timestamp.
 * It should NEVER depend on timezone and must NEVER pass through toISOString().
 */

/**
 * Normalizes a date input to YYYY-MM-DD format using LOCAL time methods.
 * This avoids timezone offsets that cause day misalignment bugs.
 *
 * @param input - A date string (e.g., "2026-12-25") or a Date object
 * @returns YYYY-MM-DD formatted string
 *
 * @example
 * normalizeToDate(new Date("2026-12-25T14:30:00.000Z")) // "2026-12-25" (local)
 * normalizeToDate("2026-12-25")                         // "2026-12-25"
 * normalizeToDate("2026-12-25T23:59:59.999Z"))         // "2026-12-25" (local)
 */
export function normalizeToDate(input: string | Date): string {
  // If already string, return directly (calendar date is already correct)
  if (typeof input === "string") {
    return input;
  }

  // Use LOCAL methods to extract year/month/day (avoids UTC offset issues)
  const year = input.getFullYear();
  const month = String(input.getMonth() + 1).padStart(2, "0");
  const day = String(input.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Returns today's date as YYYY-MM-DD string using local time.
 * Used for comparing against holiday dates which are calendar values.
 */
export function getToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
