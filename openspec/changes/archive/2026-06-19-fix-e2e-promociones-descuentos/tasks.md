# Tasks: Fix 5 E2E test bugs in promociones-descuentos

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~80-150 (8 files) |
| 400-line budget risk | Low |
| Chained PRs | No |
| Delivery strategy | ask-always — single PR |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

## Phase 1: Test infrastructure foundation

- [ ] **1.1** Move `clickConfirmDelete` from `spec.ts:50-55` → `tests/helpers.ts`; export; remove inline copy. *Accept*: exported; spec imports; tsc clean. *TDD*: N/A.

- [ ] **1.2** Create `tests/utils/descuentos-reset.ts` (singleton Prisma; `resetDescuentos()` = deleteMany + re-insert 4 seeds `{3:10, 6:15, 9:17, 12:20}`; `closeDescuentosReset()`). *Accept*: both exports; singleton; tsc clean. *TDD*: N/A. Manual DB check.

## Phase 2: Page object updates

- [ ] **2.1** (a) Add `data-testid="promocion-submit-edit-button"` to edit-mode `<Button>` in `src/components/admin/promocion-form.tsx:189`. (b) Add `submitEdit()` to `PromocionAdminPage` clicking that testid. (c) Replace `page.once('dialog')` in `deleteByTitulo()` with `clickConfirmDelete(this.page)`. *Accept*: testid present; method exists; no `page.once`; tsc clean. *RED*: `-g "S2.P.3"` fails. *GREEN*: passes.

- [ ] **2.2** Replace `page.once('dialog')` in `DescuentoAdminPage.deleteByPorcentaje()` with `clickConfirmDelete(this.page)`. *Accept*: no `page.once`; tsc clean. *RED*: `-g "S2.D.3"` fails. *GREEN*: passes.

## Phase 3: Production change

- [ ] **3.1** Expand `MESES_OPTIONS` in `src/components/admin/descuento-duracion-manager.tsx:35-40` from `[3, 6, 9, 12]` to `[1..12]` (ROADMAP). *Accept*: 12 options; labels `"N meses"`; tsc clean. *TDD*: run suite — no regression.

## Phase 4: Test updates

- [ ] **4.1** Update `tests/fixtures/descuento.fixture.ts`: add `randomMeses?: boolean` flag → `meses` from `NON_SEED_MESES = [1, 2, 4, 5, 7, 8, 10, 11]`; widen type to `1|2|...|12`. *Accept*: flag works; type covers 12; tsc clean. *TDD*: N/A.

- [ ] **4.2** Update `tests/promociones-descuentos.spec.ts`: (a) import `clickConfirmDelete` from `./helpers`; (b) `test.beforeEach(async () => { await resetDescuentos(); })`; (c) S2.P.2: `submitCreate()` → `submitEdit()` + `expect(button).toHaveText("Guardar cambios")` before click; (d) S2.D.1+S2.D.4: fixture → `{ randomMeses: true, porcentaje: 15 }`. *Accept*: all 4 edits; tsc clean. *RED*: `-g "S2.P.2|S2.D.1|S2.D.4"` all fail. *GREEN*: all 3 pass (S2.D.4 warm — R3).

## Phase 5: Verification (final gate)

- [ ] **5.1** `pnpm exec playwright test -g "S2.P.2|S2.P.3|S2.D.1|S2.D.3|S2.D.4"` — 5 pass, 0 fail.
- [ ] **5.2** `pnpm exec playwright test tests/promociones-descuentos.spec.ts` — 7 pass, 0 fail.
- [ ] **5.3** `pnpm tsc --noEmit` + `pnpm lint` — clean.

## Risk Register

- **R1** `:has-text("15%")` at `spec.ts:67,267` + `DescuentoAdminPage.ts:113-117`. `descuento-precio-final` is separate sibling (line 373). HARD: `%` stays adjacent to number.
- **R2** `deleteByTitulo`/`deleteByPorcentaje` might affect other callers. Only: 2 affected tests + `afterEach`.
- **R3** S2.D.4 cache caveat: best-effort, may fail cold (Engram #215).
- **R5** S2.P.2 test-only fix does NOT fix form/manager race for real users. Accepted.

## Out of Scope

S2.D.4 cache invalidation (Engram #215); production form/manager refactor; refactoring 3 passing tests.

## File Impact

| File | Tasks | Commits |
|------|-------|---------|
| `tests/helpers.ts` | 1.1 | 2 |
| `tests/utils/descuentos-reset.ts` | 1.2 | 5 |
| `tests/pages/PromocionAdminPage.ts` | 2.1 | 1, 2 |
| `tests/pages/DescuentoAdminPage.ts` | 2.2 | 3 |
| `src/components/admin/promocion-form.tsx` | 2.1 | 1 |
| `src/components/admin/descuento-duracion-manager.tsx` | 3.1 | 4 |
| `tests/fixtures/descuento.fixture.ts` | 4.1 | 5 |
| `tests/promociones-descuentos.spec.ts` | 4.2 | 1, 2, 5 |
