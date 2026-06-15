/**
 * Default payload for promocion E2E tests.
 *
 * The `TEST_` prefix on `titulo` is the discriminator used by the
 * cleanup helper (design §5.4, §6.3). `RUN_ID` is a per-test-run
 * timestamp so successive runs don't collide.
 */

import { TEST_DATA_PREFIX } from '../helpers';

export const RUN_ID = Date.now();

export interface PromocionFixture {
  titulo: string;
  descripcion: string;
  precio: number;
}

const ADJECTIVES = ['Verano', 'Invierno', 'Primavera', 'Otoño', 'Black', 'Cyber', 'Premium'];
const SUFFIXES = ['Matrícula', 'Cuota', 'Pack', 'Combo', 'Plan'];

export function createPromocionFixture(overrides: Partial<PromocionFixture> = {}): PromocionFixture {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const suf = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
  return {
    titulo: `${TEST_DATA_PREFIX}${adj}_${suf}_${RUN_ID}_${Math.random().toString(36).slice(2, 6)}`,
    descripcion: 'E2E test promocion — created by tests/promociones-descuentos.spec.ts',
    precio: 5000 + Math.floor(Math.random() * 5000),
    ...overrides,
  };
}
