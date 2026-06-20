# Tasks: Show Computed Final Price for Duration Discounts

## Review Workload Forecast

Estimated ~200–260 changed lines. 400-line budget risk Low. Single PR fits. Delivery ask-on-risk. Chain strategy size-exception.

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

## Phase 1: Infrastructure (TDD RED) — Vitest

- [x] 1.1 Create `src/lib/format.test.ts` — tests for `formatPriceARS`: integer, numeric string, zero, large (`1234567`→`"$ 1.234.567"`), float noise, null/undefined. Must be RED.
- [x] 1.2 `pnpm vitest run src/lib/format.test.ts` fails. If `include` excludes `src/`, update `vitest.config.ts` to match `src/**/*.test.ts`.

## Phase 2: Helper implementation (TDD GREEN)

- [x] 2.1 Create `src/lib/format.ts` — `formatPriceARS(value: number | string): string` per locked signature. JSDoc.
- [x] 2.2 `pnpm vitest run src/lib/format.test.ts` GREEN. Refactor implementation only.

## Phase 3: Format migration — Vitest only (no new tests)

- [x] 3.1 `src/components/informacion/PlansSection.tsx:5` — drop local helper, import `@/lib/format`. NBSP shift pre-accepted (#203).
- [x] 3.2 `src/components/informacion/PriceSection.tsx:8-13` — replace local `formatPrice` with import.
- [x] 3.3 `src/components/admin/promocion-form.tsx:30` — replace local `formatPriceARS` with import.
- [x] 3.4 `src/components/admin/promocion-card.tsx:18` — replace local `formatPriceARS` with import.
- [x] 3.5 `src/components/admin/GymPriceEditor.tsx:40-45` — replace local `formatPrice` with import. **Behavior change**: 2 → 0 decimals; disclose in PR description.

## Phase 4: Server prop plumbing — Vitest + Playwright

- [x] 4.1 `src/app/(admin)/admin/descuentos-duracion/page.tsx` — `Promise.all([getDescuentos(), getGymPrice()])`; pass `initialGymPrice={price}`. No new tag.
- [x] 4.2 `src/app/(public)/informacion/page.tsx` — pass `price={price}` to `<DurationDiscountsSection>`.

## Phase 5: Client component changes — Vitest + Playwright

- [x] 5.1 `src/components/admin/descuento-duracion-manager.tsx` — add `initialGymPrice: number | null`; render sibling `<span data-testid="descuento-precio-final">{formatPriceARS(gymPrice * (1 - d.porcentaje/100))}</span>` or `"Sin precio configurado"` when null. KEEP `%` span unchanged.
- [x] 5.2 `src/components/informacion/DurationDiscountsSection.tsx` — add `price: number | null`; 3rd `<TableHead>Precio final</TableHead>` + `<TableCell data-testid="dur-discount-precio-final">` per row, formatted or `"—"`.

## Phase 6: E2E + regression — Vitest + Playwright + tsc + lint

- [x] 6.1 Add 1 E2E in `tests/promociones-descuentos.spec.ts` — create 15% descuento, assert `[data-testid="descuento-precio-final"]` contains `formatPriceARS(50000 * 0.85)`. KEEP `:has-text("15%")` selectors (lines 67, 267).
- [x] 6.2 Final gate: `pnpm tsc --noEmit && pnpm eslint . && pnpm vitest run && pnpm playwright test tests/promociones-descuentos.spec.ts`. ALL clean, else do not mark complete. Full E2E → verify phase.

## Risk Register

- **R1** E2E selector coupling (HIGH): `:has-text("15%")` at `promociones-descuentos.spec.ts:67,267` + `DescuentoAdminPage.ts:113-117` must match. `%` stays adjacent; new price is separate sibling.
- **R2** PlansSection NBSP shift (LOW, #203).
- **R3** Scope discipline (MEDIUM): no `Promocion`, schema, tags, live preview.
- **R4** Vitest config excludes `src/` (LOW): fixed by 1.2.
- **R5** `GymPriceEditor` 2→0 decimal change (LOW): disclose in PR description.

## Out of Scope

Promocion, rounding-as-PRD, cross-invalidation, new actions/readers/tags/schema, live preview, mobile, i18n, full Playwright (verify).

## File Impact

| File | Task |
|------|------|
| `src/lib/format.ts` | 2.1 |
| `src/lib/format.test.ts` | 1.1 |
| `vitest.config.ts` | 1.2 |
| `src/app/(admin)/admin/descuentos-duracion/page.tsx` | 4.1 |
| `src/app/(public)/informacion/page.tsx` | 4.2 |
| `src/components/admin/descuento-duracion-manager.tsx` | 5.1 |
| `src/components/informacion/DurationDiscountsSection.tsx` | 5.2 |
| `src/components/informacion/PlansSection.tsx` | 3.1 |
| `src/components/informacion/PriceSection.tsx` | 3.2 |
| `src/components/admin/promocion-form.tsx` | 3.3 |
| `src/components/admin/promocion-card.tsx` | 3.4 |
| `src/components/admin/GymPriceEditor.tsx` | 3.5 |
| `tests/promociones-descuentos.spec.ts` | 6.1 |
