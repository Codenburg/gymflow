# Proposal: Show Computed Final Price for Duration Discounts

## Intent

Admin (`/admin/descuentos-duracion`) and public (`/informacion`) UIs show only the discount `%` per `DescuentoDuracion`. Owners do mental math; public users see no price anchor. Render the computed final price next to the `%` in both UIs using `Gym.price` as base. Medium-High UX; no DB / action / migration.

## Scope

**In**: render `gym.price * (1 - porcentaje/100)` per row in both UIs; prop plumbing; extract `formatPriceARS` to `src/lib/format.ts` + migrate 5 local duplicates; 1 testid per render site; 1 unit + 1 E2E test.

**Out**: `Promocion` (absolute `precio`); cache cross-invalidation; new readers/actions/schema/env/packages; live preview in admin form; rounding as PRD question; mobile redesign (in flight per ROADMAP).

## Capabilities

> Contract with `sdd-spec`. Each modified capability produces a delta spec.

**New**: None. `formatPriceARS` extraction is a refactor, not a feature.

**Modified**:
- `admin-panel`: each descuento list item in `/admin/descuentos-duracion` SHALL render computed final price. `gym.price === null` → "Sin precio configurado".
- `gym-config`: `DurationDiscountsSection` table in `/informacion` SHALL add 3rd "Precio final" column. `gym.price === null` → "—".

## Approach

1. New `src/lib/format.ts`: `formatPriceARS(value: number \| string)` using `Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 })`. The `0` decimals absorbs float noise (`50000 * 0.9 = 45000.000000001` → `"$ 45.000"`).
2. Migrate 5 local duplicates; admin page adds `getGymPrice()` to awaited reads + `initialGymPrice` prop; public page passes already-fetched `price` to section.
3. Both client components compute + render per row with new testids (`descuento-precio-final`, `dur-discount-precio-final`); null fallback per capability spec. Vitest unit test; 1 new E2E scenario in `tests/promociones-descuentos.spec.ts`.

## Decisions Baked In

**Product (locked)**: (1) UX: solo final price + chip with % (1C). (2) Null price: "Sin precio configurado" (2B). (3) `formatPriceARS` extracted + 5 sites migrated (3A). (4) No live preview in admin (4B). (5) Scope: `DescuentoDuracion` only.

**Technical (explore)**: (6) No cross-tag invalidation — render-time composition. (7) `maximumFractionDigits: 0` is de-facto rounding convention. (8) No schema/action/reader/tag changes; ~150–250 LOC.

## Affected Areas

| File | Impact | Change |
|---|---|---|
| `src/lib/format.ts` | New | `formatPriceARS` helper. |
| `src/app/(admin)/admin/descuentos-duracion/page.tsx` | Modified | +`getGymPrice()` await, +`initialGymPrice` prop. |
| `src/components/admin/descuento-duracion-manager.tsx` | Modified | +prop, +per-row render, +testid, null fallback. |
| `src/app/(public)/informacion/page.tsx` | Modified | Pass `price` to `DurationDiscountsSection`. |
| `src/components/informacion/DurationDiscountsSection.tsx` | Modified | +prop, +3rd column, +testid, null fallback. |
| `src/components/informacion/PlansSection.tsx` | Modified | Migrate local helper. |
| `src/components/informacion/PriceSection.tsx` | Modified | Migrate local helper. |
| `src/components/admin/promocion-form.tsx` | Modified | Migrate local helper. |
| `src/components/admin/promocion-card.tsx` | Modified | Migrate local helper. |
| `src/components/admin/GymPriceEditor.tsx` | Modified | Migrate local helper. |
| `src/lib/format.test.ts` | New | Vitest unit test. |
| `tests/promociones-descuentos.spec.ts` | Modified | +1 E2E scenario. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **E2E selector coupling** (`:has-text("15%")` in `promociones-descuentos.spec.ts:67,267` + `DescuentoAdminPage.ts:113-117`). **HARD**: literal `%` MUST stay adjacent to number inside `[data-testid="descuento-list-item"]`. | High | Keep `%` text node adjacent; new "Precio final" lives in separate sibling — does not break `:has-text` match. |
| Visual regression from 5-site format migration. | Med | Format matches `PriceSection`/`GymPriceEditor` convention; only `PlansSection` visually shifts (drops manual `$ ` prefix). E2E + visual diff before merge. |
| Scope creep into `Promocion`. | Low | Explicitly out of scope; `promocion-form/card.tsx` only touched for the format refactor (incidental). |

## Rollback Plan

Single PR, no migration, no DB change. `git revert <sha>` cleanly removes the feature: helper file deletion reverts the 5 migrations to local definitions; prop additions revert independently. No persistent state.

## Success Criteria

- [ ] Admin list item shows computed final price; null-price → "Sin precio configurado".
- [ ] Public table shows 3rd column; null-price → "—".
- [ ] All 5 local `formatPrice`/`formatPriceARS` removed; only `src/lib/format.ts` remains.
- [ ] Unit + E2E tests pass; existing `:has-text("15%")` selectors still match.
- [ ] `tsc` + ESLint + `next build` clean, zero new errors; components < 200 lines.

## Config Compliance

- `rules.proposal` (rollback ✅, affected modules ✅, perf/bundle/breaking ✅) — no new deps, additive props only.
- `selectors.strategy: data-testid` — new testids declared.
- Component size limit — tracked in success criteria.
