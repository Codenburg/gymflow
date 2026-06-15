/**
 * Default payload for descuento (duration discount) E2E tests.
 *
 * The `porcentaje` is a number 0-100 (the API field). There's no
 * name/description field on the descuento, so cleanup uses the
 * `(meses, porcentaje)` pair as the discriminator. Tests track the
 * created descuento IDs in a shared array for `afterEach` cleanup.
 */

import { TEST_DATA_PREFIX } from '../helpers';

export const RUN_ID = Date.now();

export interface DescuentoFixture {
  /** 3, 6, 9, or 12 (the MESES_OPTIONS from the component). */
  meses: 3 | 6 | 9 | 12;
  /** 0-100. */
  porcentaje: number;
  /** Human-readable label for logs. */
  label: string;
}

export function createDescuentoFixture(overrides: Partial<DescuentoFixture> = {}): DescuentoFixture {
  return {
    meses: 3,
    porcentaje: 10 + Math.floor(Math.random() * 20), // 10-29
    label: `${TEST_DATA_PREFIX}Descuento_${RUN_ID}_${Math.random().toString(36).slice(2, 6)}`,
    ...overrides,
  };
}
