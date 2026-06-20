# Proposal: Fix 5 pre-existing E2E test bugs in promociones-descuentos

## Intent

Fix 5 pre-existing E2E bugs in `tests/promociones-descuentos.spec.ts` (S2.P.2, S2.P.3, S2.D.1, S2.D.3, S2.D.4) surfaced during `descuento-precio-final` verify and masked by the AdminLayout strict-mode bug (`a1b1990`). They block archiving that change. No production behavior changes. Single PR, `git revert` cleanly removes.

## Scope

### In Scope
- **S2.P.2** — test-only: add `data-testid="promocion-submit-edit-button"` on edit-mode submit; add `submitEdit()` to `PromocionAdminPage`; add `toHaveText("Guardar cambios")` assertion.
- **S2.P.3** — replace `page.once('dialog')` in `deleteByTitulo()` with existing `clickConfirmDelete(page)` helper.
- **S2.D.1** — add `tests/utils/descuentos-reset.ts` (mirrors `gym-reset.ts`); spec adds `beforeEach → resetDescuentos()`.
- **S2.D.3** — same as S2.P.3 in `deleteByPorcentaje()`.
- **S2.D.4** — same fixture reset as S2.D.1. Cache caveat in R3.

Out of scope: production form/manager refactor for S2.P.2; S2.D.4 cache invalidation gotcha (Engram #215) — separate follow-up; refactoring the 3 currently-passing tests.

## Capabilities

- **New**: None. **Modified**: None. Pure test-infrastructure change.

## Approach

Two patterns: (1) **AlertDialog page-object** (S2.P.3 + S2.D.3): swap `page.once('dialog')` for `page.getByRole('button', { name: /^Eliminar$/ }).click()`. (2) **Prisma-direct reset** (S2.D.1 + S2.D.4): mirror `gym-reset.ts`; `beforeEach` resets to 4 seed values. S2.P.2: 3 plausible root causes — **A1 (test-only)** is conservative pick; production fix deferred.

## Affected Areas

| File | Change | Scenarios |
|------|--------|-----------|
| `tests/promociones-descuentos.spec.ts` | modify: `beforeEach → resetDescuentos()` | S2.D.1, S2.D.4 |
| `tests/pages/PromocionAdminPage.ts` | modify: `deleteByTitulo` → `clickConfirmDelete`; add `submitEdit()` | S2.P.2, S2.P.3 |
| `tests/pages/DescuentoAdminPage.ts` | modify: `deleteByPorcentaje` → `clickConfirmDelete` | S2.D.3 |
| `tests/fixtures/descuento.fixture.ts` | modify: add `randomMeses` flag (avoids 3, 6, 9, 12) | S2.D.1, S2.D.4 |
| `tests/utils/descuentos-reset.ts` | new: Prisma-direct reset singleton | S2.D.1, S2.D.4 |
| `src/components/admin/promocion-form.tsx` | modify: 1-line testid on edit-mode submit | S2.P.2 |

**0 production logic changes.** 1 new testid. R1 `:has-text("15%")` preserved. `prisma/schema.prisma`, `src/app/actions/**`, `src/lib/**`: untouched.

## Risks

| Risk | Lik | Mitigation |
|------|-----|------------|
| **R1** — `:has-text("15%")` coupling at `spec.ts:67,267` + `DescuentoAdminPage.ts:113-117` MUST match. | Low | New testid is separate `<span>`. Re-run the 3 passing tests. |
| **R2** — `deleteByTitulo` / `deleteByPorcentaje` change might affect other callers. | Low | Only callers are the 2 affected tests + `afterEach` (uses correct helper). Run full suite. |
| **R3** — S2.D.4 cache caveat: passes when warm; may fail cold (`getGymPrice` cacheTag invalidated only by `GymPriceEditor` server action — Engram #215). | Med | Best-effort in apply-phase. Out of scope. |
| **R5** — S2.P.2 test-only fix does NOT fix underlying form/manager race for real users. | Med | Accepted. Production fix separate. |

## Rollback Plan

Single PR. No migration, no DB change, no production behavior change, no schema change, no new cache tag, no new server action, no new reader. `git revert` cleanly removes. AdminLayout fix (`a1b1990`) untouched.

## Dependencies

No migration, no new action, no new reader, no new env var, no new package. 1 new testid, 1 new test utility, 0 new production code.

## Success Criteria

- [ ] All 7 tests pass (modulo S2.D.4 cold-cache per R3); S2.P.1 + S2.D.2 still pass.
- [ ] `:has-text("15%")` selectors still match.
- [ ] `tsc --noEmit` clean, `lint` 0 new errors, `vitest` 159/159.
- [ ] No new `data-testid` collisions. The 16 existing testids unchanged.
