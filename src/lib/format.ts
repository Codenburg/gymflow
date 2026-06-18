/**
 * Domain-level currency formatting utilities.
 *
 * Lives in `src/lib/` per the project's `architecture.layering` rule
 * (`openspec/config.yaml`): this directory is the **domain** layer and
 * MUST contain pure functions with no side effects.
 *
 * The single source of truth for ARS currency formatting across both
 * the admin panel and the public app. Five local `formatPrice` /
 * `formatPriceARS` duplicates were extracted to this module as part
 * of `descuento-precio-final`.
 */

/**
 * Formats a numeric value as Argentine peso currency using
 * `Intl.NumberFormat` with `es-AR` locale and the ARS currency.
 *
 * - Returns a string like `"$ 50.000"` (es-AR convention: peso sign
 *   prefix, period as thousands separator, no decimals).
 * - `maximumFractionDigits: 0` absorbs IEEE 754 float noise so e.g.
 *   `50000 * 0.9 = 45000.00000000001` renders as `"$ 45.000"`.
 * - Accepts `number | string` so callers that read the price from a
 *   Prisma `Decimal` (or a form field) can pass it without explicit
 *   conversion. Internally coerces via `Number(value)`.
 *
 * @param value - A number or a numeric string. `null` / `undefined`
 *   are tolerated at runtime (do not throw) — they are NOT part of
 *   the type signature; callers should guard upstream.
 * @returns A non-empty locale-formatted ARS currency string.
 *
 * @example
 *   formatPriceARS(50000)        // "$ 50.000"
 *   formatPriceARS('50000')      // "$ 50.000"
 *   formatPriceARS(1234567)      // "$ 1.234.567"
 *   formatPriceARS(50000 * 0.9)  // "$ 45.000" (rounds float noise)
 */
export function formatPriceARS(value: number | string): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value));
}
