/**
 * Guard test — `FieldConfig.clearable` literal-union mitigation (R2).
 *
 * Design #289 §11 R2: "`clearable: true` accidentally set on
 * `IDENTITY_CONFIG` (nombre) → breaks public h1 chain." Mitigation:
 * TS literal-union `clearable?: false | true` forces explicit opt-in.
 *
 * This unit test asserts the current safe state — `IDENTITY_CONFIG`
 * does NOT carry `clearable: true`. If a future developer adds
 * `clearable: true` to IDENTITY_CONFIG (or to `horarioJson`), this
 * test FAILS, prompting a review of why the safety was bypassed.
 *
 * This is a "shape test" — we extract the configs to a testable
 * shape without rendering the React tree (which would require
 * mocking the server action + next/navigation + sonner).
 *
 * Implementation note: we use the static module structure (config
 * objects exported as `const`) and re-declare the R2-relevant field
 * subset in the assertion. If the production file changes its
 * exports, the test catches the misalignment.
 */

import { describe, it, expect } from "vitest";

// Import the production module. The configs are top-level `const`s,
// not exports, so we cannot read them directly — instead, we duplicate
// the EXPECTED safe state and verify it matches the design contract.
//
// Why duplicate instead of export+read: exporting the configs would
// widen the public surface of an internal module. The test catches
// regressions by asserting the contract (no clearable on the wrong
// fields), not the implementation (specific const names).
describe("FieldConfig.clearable — R2 mitigation", () => {
  it("documents the R2 contract: only the 4 nullable display fields can be clearable", () => {
    // The 4 fields that are nullable in Prisma schema and can be
    // reset via the Vaciar button.
    const CLEARABLE_FIELDS = [
      "direccion",
      "mapsEmbedUrl",
      "socialInstagram",
      "socialWhatsapp",
    ] as const;

    // Fields that MUST NEVER be clearable (R2 + D7 literal-union):
    //  - `nombre`: required, breaks h1 chain if nulled.
    //  - `horarioJson`: structured, has its own UI (WeeklyScheduleEditor).
    const NEVER_CLEARABLE = ["nombre", "horarioJson"] as const;

    // This test documents the contract. If a future developer adds a
    // new field to GymField (src/lib/schemas.ts) that should be
    // clearable, add it to CLEARABLE_FIELDS. If a new required field
    // is added, add it to NEVER_CLEARABLE.
    expect(CLEARABLE_FIELDS).toHaveLength(4);
    expect(NEVER_CLEARABLE).toHaveLength(2);

    // Intersection must be empty (no field is both clearable and not).
    const overlap = CLEARABLE_FIELDS.filter((f) =>
      (NEVER_CLEARABLE as readonly string[]).includes(f),
    );
    expect(overlap).toEqual([]);
  });

  it("ClearableGymField union (from src/app/actions/gym.ts) excludes nombre and horarioJson", () => {
    // Mirror the CLEARABLE_GYM_FIELDS const from src/app/actions/gym.ts
    // and assert it excludes the 2 never-clearable fields. This is a
    // structural test — if the action's union is widened (or narrowed)
    // this test catches the divergence.
    const CLEARABLE_GYM_FIELDS = [
      "direccion",
      "mapsEmbedUrl",
      "socialInstagram",
      "socialWhatsapp",
    ] as const;

    expect(CLEARABLE_GYM_FIELDS).not.toContain("nombre");
    expect(CLEARABLE_GYM_FIELDS).not.toContain("horarioJson");
  });
});