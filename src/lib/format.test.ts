/**
 * Unit tests for `formatPriceARS` (src/lib/format.ts).
 *
 * RED-first: this file is committed BEFORE `formatPriceARS` exists.
 * The test imports a symbol that does not exist yet — guaranteed RED.
 *
 * Coverage (per design §"TDD Order" step 1):
 *   - integer input  (50000    → "$ 50.000")
 *   - numeric string ("50000"  → "$ 50.000")
 *   - zero           (0        → "$ 0")
 *   - large numbers  (1234567  → "$ 1.234.567")
 *   - float noise    (45000.000000001 → "$ 45.000")
 *   - null           (returns a string, does NOT throw)
 *   - undefined      (returns a string, does NOT throw)
 *
 * Assertion strategy: we use a regex / substring match because
 * `Intl.NumberFormat` with `style: "currency"` inserts a non-breaking
 * space (U+00A0) between the currency symbol and the number. Pinning
 * the exact whitespace in a string equality check is brittle across
 * Node / ICU versions.
 */

import { describe, it, expect } from 'vitest';
import { formatPriceARS } from './format';

describe('formatPriceARS', () => {
  describe('happy path', () => {
    it('formats an integer with the es-AR currency convention', () => {
      const result = formatPriceARS(50000);
      // $ + (any whitespace) + 50.000
      expect(result).toMatch(/^\$\s*50\.000$/);
      expect(result).toContain('50.000');
      expect(result).toContain('$');
    });

    it('formats a numeric string the same as its number form', () => {
      const result = formatPriceARS('50000');
      expect(result).toMatch(/^\$\s*50\.000$/);
    });

    it('formats zero', () => {
      const result = formatPriceARS(0);
      expect(result).toMatch(/^\$\s*0$/);
      expect(result).toContain('0');
    });

    it('formats large numbers with the es-AR thousand separator', () => {
      const result = formatPriceARS(1234567);
      expect(result).toContain('1.234.567');
      expect(result).toContain('$');
    });

    it('rounds float noise to the nearest integer (no decimals)', () => {
      // 50000 * 0.9 in IEEE 754 ≈ 45000.00000000001
      const result = formatPriceARS(50000 * 0.9);
      expect(result).toMatch(/^\$\s*45\.000$/);
      // The function MUST NOT include ",00" or other decimal fragments.
      expect(result).not.toMatch(/,0/);
    });
  });

  describe('input tolerance', () => {
    it('does not throw when called with null', () => {
      // The locked signature is `number | string` — but per design the
      // helper MUST not throw for null either. Cast to any to bypass
      // the type guard (this is a behavior test, not a type test).
      expect(() => formatPriceARS(null as unknown as number)).not.toThrow();
      const result = formatPriceARS(null as unknown as number);
      expect(typeof result).toBe('string');
    });

    it('does not throw when called with undefined', () => {
      expect(() => formatPriceARS(undefined as unknown as number)).not.toThrow();
      const result = formatPriceARS(undefined as unknown as number);
      expect(typeof result).toBe('string');
    });

    it('accepts a stringified decimal (per locked spec)', () => {
      const result = formatPriceARS('45000.5');
      // maximumFractionDigits: 0 → rounds to 45.001 in es-AR (half-up)
      // We assert only that it does not throw and includes the digits.
      expect(result).toContain('45');
      expect(result).toContain('$');
    });
  });
});
