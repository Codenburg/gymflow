# Proposal: E2E coverage for critical flows (1.0 prep · Recomendación 3)

## Intent

Complete E2E coverage of 5 critical admin/user flows for 1.0. The suite covers gym-config, horario, and page-loading — but **rutina, feriado, promo+descuento, trainer CRUD, and the auth happy-path are partial or duplicated** (8 inline `loginAsAdmin` helpers). **Goal**: ~25-30 green E2E tests for the gaps with one helper layer; fix GGA-FOLLOWUP-4, 5.2.3 isolation, and shell-execution time in one pass.

## Scope (gap, not greenfield)

- **Rutina CRUD** (`admin-e2e.spec.ts:162-275` covers form fields, edit read). **Missing**: full submit + day/ejercicio assign + delete + list visibility.
- **Feriado CRUD** (`feriados-badge-e2e.spec.ts:1-71` is badge read-side only). **Missing**: admin `/admin/feriados` create/edit/delete + duplicate-date 409.
- **Promociones CRUD** (`promocion-e2e.spec.ts:52-304` covers toggle, resync, layout). **Missing**: create-via-form submit + edit save + delete via UI.
- **Descuentos / Trainer CRUD**: **none**. **Missing**: full CRUD on `/admin/descuentos-duracion` + `/admin/trainers` (≥3 tests each).
- **Auth happy-path** (`security-admin.spec.ts:5.1,5.3-5.7` + `admin-e2e.spec.ts:8.1.1,8.1.3`). **Missing**: login success + invalid-creds error (gap on 8.1.2).

**Out of scope**: DnD (`dnd-rutina.spec.ts` is `test.skip()`). Non-admin flows (no `/api/auth/sign-up`). Perf, a11y. Existing specs untouched.

## Capabilities

### New

- **`test-infrastructure`**: 6 page objects in `tests/pages/` + `tests/helpers.ts` (`loginAsAdmin`, `cleanTestData`, `waitForServerAction`).
- **`e2e-coverage`**: 5 specs in `tests/e2e/{rutinas,feriados,promociones-descuentos,trainers,auth}.spec.ts`. Tags: `@critical`, `@e2e`, `@flow-{name}`.

### Modified

None (test-only).

## Approach

1. **Slice 0** (refactor): extract `helpers.ts` + `tests/pages/`; update 8 specs to import.
2. **3 slices** per ROADMAP: **S1 rutinas**, **S2 feriados+promos+descuentos**, **S3 trainers+auth**.
3. **Isolation**: `serial` mode; `cleanTestData(page)` in `afterEach` deletes `TEST_*` records via REST APIs.
4. **Selectors**: `getByRole` + `getByLabel` first; new `data-testid` only on new elements.
5. **Config + speed** (GGA-FOLLOWUP-4, -5): `playwright.config.ts:8` `retries: 0` → `1`; document `pnpm dev` background pre-start; add `test:fast` script.

## Affected Areas

- **New**: 6 page objects, `tests/helpers.ts`, 5 specs, `tests/README.md`.
- **Modified**: `playwright.config.ts:8`; `package.json`; `tests/utils/security-helpers.ts:28-29`.
- **Untouched**: product code, `.gga-ignore`, existing specs. **Diff**: ~600/-30, 3 PRs (<500 LOC each).

## Risks

- **R1** `saveField` flakiness (GGA-FOLLOWUP-4). *Med.* `retries: 1` + `TEST_*` isolation.
- **R2** Data leaks (5.2.3 root cause). *Med.* Serial + `afterEach` cleanup.
- **R3** 5-8 min shell execution (GGA-FOLLOWUP-5). *Low (process).* Pre-start documented.

## Rollback Plan

- **Per slice**: `git revert <slice-PR>` removes spec + page objects; `retries: 1` is strictly better.
- **Worst case**: revert the config line; existing tests stay green.
- **Helper refactor**: every old spec imports the new helper. If a refactor breaks a test, revert that commit only.

## Dependencies

Port 3000 (background `pnpm dev`). Seeded admin. REST APIs: `/api/promociones`, `/api/feriados`, `/api/rutinas`.

## Success Criteria

- [ ] S1: 5+ rutina. S2: 9+. S3: 5+.
- [ ] `retries: 1` — 0 flakes; new suite **<2 min** (vs 5-8 min).
- [ ] 5.2.3 stays green; 0 inline `loginAsAdmin`; Vitest 100% green.
