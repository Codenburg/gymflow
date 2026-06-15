/**
 * Default payload for rutina E2E tests.
 *
 * The `TEST_` prefix on `nombre` is the discriminator used by
 * cleanup helpers (design §5.4, §6.1). `RUN_ID` is a per-test-run
 * timestamp so successive runs don't collide.
 */

import { TEST_DATA_PREFIX } from '../helpers';

export const RUN_ID = Date.now();

export interface RutinaFixture {
  nombre: string;
  descripcion: string;
  tipo: 'Fuerza' | 'Hipertrofia' | 'Resistencia' | 'Movilidad';
  dias: Array<{
    musculosEnfocados: string[];
    ejercicios: Array<{ nombre: string; formato: string }>;
  }>;
}

/** Fresh fixture per test (unique nombre to avoid collisions). */
export function createRutinaFixture(overrides: Partial<RutinaFixture> = {}): RutinaFixture {
  return {
    nombre: `${TEST_DATA_PREFIX}Rutina_${RUN_ID}_${Math.random().toString(36).slice(2, 8)}`,
    descripcion: 'E2E test rutina — created by tests/rutinas.spec.ts',
    tipo: 'Fuerza',
    dias: [
      {
        musculosEnfocados: ['Pecho', 'Tríceps'],
        ejercicios: [
          { nombre: 'Press banca plano', formato: '4x10' },
          { nombre: 'Press inclinado mancuernas', formato: '3x12' },
        ],
      },
    ],
    ...overrides,
  };
}
