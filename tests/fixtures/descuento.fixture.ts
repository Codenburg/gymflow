/**
 * Default payload for descuento (duration discount) E2E tests.
 *
 * The `porcentaje` is a number 0-100 (the API field). There's no
 * name/description field on the descuento, so cleanup uses the
 * `(meses, porcentaje)` pair as the discriminator. Tests track the
 * created descuento IDs in a shared array for `afterEach` cleanup.
 *
 * The `meses` field covers all 12 months (1-12) after the
 * `MESES_OPTIONS` expansion in `src/components/admin/descuento-duracion-manager.tsx`.
 * The `randomMeses` flag picks a value from `NON_SEED_MESES` (months
 * NOT in the seed pool {3, 6, 9, 12}) to avoid the
 * `@@unique([gymId, meses])` collision when creating a new descuento.
 */

import { TEST_DATA_PREFIX } from '../helpers';

export const RUN_ID = Date.now();

/** Months NOT in the seed pool — safe to use for new descuentos
 *  without colliding with the 4 seed values (3, 6, 9, 12). */
export const NON_SEED_MESES = [1, 2, 4, 5, 7, 8, 10, 11] as const;

export type MesesValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface DescuentoFixture {
  /** 1-12 (all months after the MESES_OPTIONS expansion). */
  meses: MesesValue;
  /** 0-100. */
  porcentaje: number;
  /** Pick a `meses` value from NON_SEED_MESES to avoid unique-constraint
   *  collisions with the seed pool. */
  randomMeses?: boolean;
  /** Human-readable label for logs. */
  label: string;
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function createDescuentoFixture(overrides: Partial<DescuentoFixture> = {}): DescuentoFixture {
  return {
    meses: overrides.meses ?? (overrides.randomMeses ? pickRandom(NON_SEED_MESES) : 3),
    porcentaje: 10 + Math.floor(Math.random() * 20), // 10-29
    label: `${TEST_DATA_PREFIX}Descuento_${RUN_ID}_${Math.random().toString(36).slice(2, 6)}`,
    ...overrides,
  };
}
