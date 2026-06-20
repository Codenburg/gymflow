# Design: descuento-precio-final

> **Status:** Draft (sdd-design phase)
> **Capability contract:** 0 new, 2 modified (`admin-panel`, `gym-config`)
> **Cross-cutting:** `formatPriceARS` extraction per spec option A (shared precondition in both deltas)
> **Mode:** hybrid (this file + Engram observation update on `feature/descuento-precio-final`)

## Technical Approach

Surface the computed final price (`gym.price * (1 - porcentaje/100)`) alongside the percentage in both the admin list item and the public info table, by adding `gymPrice` as a server-prop to the two existing client components and introducing a single pure helper `formatPriceARS` in `src/lib/format.ts` that the 5 legacy duplicates also migrate to. Server-side data fetch (already established pattern in the two pages) is the only data source — no client-side fetch, no new reader, no new cache tag, no cross-tag invalidation. The admin form keeps its current post-save re-render model; no live preview is added (per locked answer 4B).

## Architecture Decisions

| # | Decision | Choice | Alternatives considered | Rationale |
|---|----------|--------|-------------------------|-----------|
| 1 | Helper shape | Pure function `formatPriceARS(value: number \| string): string` in `src/lib/format.ts` (domain layer) | Custom hook / `useFormatPrice` / inline `Intl.NumberFormat` in each site | Pure function: zero React coupling, trivially unit-testable, no `useMemo` cost, no `"use client"` requirement, no hook-rule constraints. Migration sites get a 1-import swap. `src/lib/` is the project's domain layer per `openspec/config.yaml` `architecture.layering`. |
| 2 | Live preview in admin | NO — keep current save-then-re-render model | `useWatch` on `porcentaje` field for live recalculation | Locked product answer 4B. Avoids `useWatch` re-render surface on the form, keeps the action as the single source of truth, matches the existing post-save UX of `descuento-duracion-manager.tsx`. |
| 3 | Cross-tag invalidation | NO — each action's existing `revalidate` scope is sufficient | Add `revalidateTag("gym-config")` inside `descuentos-duracion` actions, and vice-versa | Explore finding: prices and discounts are independent entities. The admin page re-fetches both on its own revalidation path; the public page does the same. Adding cross-tags creates a write-coupling that is not justified by the data model. |
| 4 | Data flow for the two client components | Server page fetches `gymPrice` + `descuentos` and passes both as serializable props | Client-side `useEffect` fetch of gym price; shared context provider | Server-side prop passing is the project's established RSC pattern (see `informacion/page.tsx` already calling `getGymPrice()`). It avoids a client-side waterfall, keeps the RSC boundary clean, and serializes deterministically. |
| 5 | Public table column vs chip/badge | 3rd `<TableHead>` + `<TableCell>` "Precio final" column (locked answer 1C) | Inline chip on the percentage cell; badge per row; tooltip | 1C is the user's explicit pick. Column keeps the table scan-friendly and matches the existing 2-column layout (Duración, % off) being extended symmetrically. The 3rd column stays visible even when `gymPrice` is null, rendering an em dash `"—"` to avoid layout shift. |

## Module Interaction Overview

```
                  src/lib/format.ts (domain, pure, no React, no DB, no IO)
                            ▲
                            │  formatPriceARS(...)
            ┌───────────────┼───────────────┬─────────────────────────┐
            │               │               │                         │
  src/components/      src/components/  src/components/         src/components/
  informacion/         informacion/     admin/                  admin/
  PlansSection.tsx     PriceSection.tsx promocion-form.tsx     promocion-card.tsx
  (#1 migration)       (#2 migration)   GymPriceEditor.tsx     descuento-duracion-manager.tsx
                                       (#3+#4 migrations)      (consumes new prop gymPrice)
            ▲
            │  formatPriceARS(...)
            │
  src/components/
  informacion/
  DurationDiscountsSection.tsx
  (consumes new prop gymPrice, adds 3rd column)
```

`formatPriceARS` is the only new module. It has **zero dependencies** (no React, no Prisma, no Next imports) — it's a pure number-to-string transform. The 7 call sites are all in UI components; the 2 server pages call `getGymPrice()` and `getDescuentos()` (existing infrastructure readers) and pass results down.

## Data Flow

### Admin flow (write + re-render with computed price)

```
User                Page (RSC)              Server Action           Data                Client Component
 │                    │                          │                    │                       │
 │  GET /admin/       │                          │                    │                       │
 │  descuentos-       │                          │                    │                       │
 │  duracion          │                          │                    │                       │
 ├───────────────────►│  getGymPrice() (NEW)     │                    │                       │
 │                    ├──────────────────────────┴───────────────────►│  Prisma              │
 │                    │  getDescuentos() (EXISTING)                  │  Gym.findFirst       │
 │                    ├─────────────────────────────────────────────►│  Descuento.findMany  │
 │                    │◄─────────────────────────────────────────────┤                      │
 │                    │  { gymPrice, descuentos }                                              │
 │                    │                                                                       │
 │                    │  <DescuentoDuracionManager descuentos={...} gymPrice={...} />         │
 │                    ├───────────────────────────────────────────────────────────────────────►│
 │                    │                                                                       │  for each d:
 │                    │                                                                       │    formatPriceARS(
 │                    │                                                                       │      gymPrice * (1 - d.porcentaje/100)
 │                    │                                                                       │    )
 │                    │                                                                       │
 │  Edit form         │                                                                       │
 ├───────────────────►│  form action ──► updateDescuento() or deleteDescuento()                │
 │  Submit            │                │                                                     │
 │                    │                │  revalidatePath("/admin/descuentos-duracion")        │
 │                    │                │  (EXISTING — no new tag)                             │
 │                    │                │◄────                                               ───┤
 │                    │◄───────────────┤                                                     │
 │                    │  re-render RSC  │                                                     │
 │                    │  → re-fetch    │                                                     │
 │                    │  → re-pass     │                                                     │
 │                    │    gymPrice    │                                                     │
 │                    ├───────────────────────────────────────────────────────────────────────►│
 │                    │                                                                       │  re-render with
 │                    │                                                                       │  updated gymPrice
 │                    │                                                                       │  + new computed
 │                    │                                                                       │  final prices
 │  Sees new price    │                                                                       │
 │◄───────────────────┤◄──────────────────────────────────────────────────────────────────────┤
```

### Public flow (read-only)

```
Page (RSC)                Data                Client Component
 │                          │                       │
 │  getGymPrice() (EXIST)   │                       │
 ├─────────────────────────►│  Gym.findFirst        │
 │  getDescuentos() (EXIST) │                       │
 ├─────────────────────────►│  Descuento.findMany   │
 │◄─────────────────────────┤                       │
 │  { gymPrice, descuentos }                        │
 │                          │                       │
 │  <DurationDiscountsSection descuentos={...} gymPrice={...} />  │
 ├─────────────────────────────────────────────────►│
 │                          │                       │  renders existing
 │                          │                       │  2-col table +
 │                          │                       │  NEW 3rd col
 │                          │                       │  "Precio final"
 │                          │                       │  using formatPriceARS()
```

## File Impact

| File | Action | Diff hint | Spec scenario it satisfies |
|------|--------|-----------|----------------------------|
| `src/lib/format.ts` | Create | Export `formatPriceARS` per locked signature | Cross-cutting precondition in both deltas |
| `src/lib/format.test.ts` | Create | Vitest unit tests (RED-first per strict TDD) | TDD enforcement |
| `src/app/(admin)/admin/descuentos-duracion/page.tsx` | Modify | Add `getGymPrice()` call; pass `gymPrice` prop to `<DescuentoDuracionManager>` | admin-panel delta: server page surface |
| `src/app/(public)/informacion/page.tsx` | Modify | Already calls `getGymPrice()` — verify it passes `gymPrice` to `<DurationDiscountsSection>` (likely just a prop add) | gym-config delta: server page surface |
| `src/components/admin/descuento-duracion-manager.tsx` | Modify | Accept `gymPrice: number \| null` prop; in list item, render NEW sibling element `<span data-testid="descuento-precio-final">{formatPriceARS(gymPrice * (1 - d.porcentaje/100))}</span>` OR literal `"Sin precio configurado"` when null; KEEP the existing `%` literal adjacent to the number inside the parent `data-testid="descuento-list-item"` | admin-panel delta: list item MUST scenario (E2E selector coupling) |
| `src/components/informacion/DurationDiscountsSection.tsx` | Modify | Accept `gymPrice: number \| null` prop; add 3rd `<TableHead>Precio final</TableHead>` + `<TableCell>` rendering `formatPriceARS(...)` or em dash `"—"` when null | gym-config delta: public table column |
| `src/components/informacion/PlansSection.tsx` | Modify | Replace local `Intl.NumberFormat` with `formatPriceARS` import | Cross-cutting: site #1 of 5 |
| `src/components/informacion/PriceSection.tsx` | Modify | Same migration | Cross-cutting: site #2 of 5 |
| `src/components/admin/promocion-form.tsx` | Modify | Same migration | Cross-cutting: site #3 of 5 |
| `src/components/admin/promocion-card.tsx` | Modify | Same migration | Cross-cutting: site #4 of 5 |
| `src/components/admin/GymPriceEditor.tsx` | Modify | Same migration | Cross-cutting: site #5 of 5 |
| `tests/promociones-descuentos.spec.ts` | Modify | Add 1 new E2E scenario asserting admin list item shows `data-testid="descuento-precio-final"` with the computed price; MUST NOT modify the existing `:has-text("15%")` selectors | admin-panel delta: verify-phase target |

**Total:** 2 new (`format.ts`, `format.test.ts`), 9 modified, 0 deleted. **0 new server actions, 0 new readers, 0 new cache tags, 0 new DB columns, 0 schema migration.**

## TDD Order (STRICT — apply phase must follow exactly)

1. **RED** — Write `src/lib/format.test.ts` first. Cover: integer input (`50000` → `"$ 50.000"`), numeric string input (`"50000"` → `"$ 50.000"`), zero (`0` → `"$ 0"`), large numbers (`1234567` → `"$ 1.234.567"`), null (decide + assert), undefined (decide + assert). The test references `formatPriceARS` which does NOT exist yet — guaranteed RED.
2. **GREEN** — Implement `src/lib/format.ts` per locked signature. Run `pnpm vitest run src/lib/format.test.ts`. Confirm GREEN before proceeding.
3. **REFACTOR** — extract any duplication, ensure `Intl.NumberFormat` is the only call, add JSDoc. Re-run tests.
4. **Migrate the 5 sites** — no new tests needed; they consume the now-tested helper. Run linter + typecheck.
5. **Server page prop additions** — update admin and public pages. No new tests (these are read-paths to existing readers; the rendering is covered by E2E).
6. **Client component changes** — admin list item adds the sibling element; public table adds the 3rd column. Still no new unit tests; covered by E2E.
7. **E2E scenario** — add 1 new test in `tests/promociones-descuentos.spec.ts` that asserts the new `data-testid="descuento-precio-final"` shows the formatted price. Use `formatPriceARS(50000 * 0.85)` in the test setup so the assertion is deterministic.
8. **Full regression** — run full Vitest suite + full Playwright suite. The `:has-text("15%")` selectors MUST keep passing without modification.

## Test Strategy

| Layer | What to test | Approach |
|-------|--------------|----------|
| **Unit (Vitest)** | `formatPriceARS` happy paths + edge cases (null, undefined, 0, large numbers, string vs number input, the `"$ X.XXX"` pattern with NBSP) | 1 new file `src/lib/format.test.ts`. RED-first per TDD order. |
| **E2E (Playwright)** | Admin list item renders the new `data-testid="descuento-precio-final"` with the computed final price; existing `:has-text("15%")` selectors keep matching the unmodified sibling text | 1 new scenario in `tests/promociones-descuentos.spec.ts`. Existing scenarios must NOT break. |
| **E2E regression** | Full Playwright suite — every test that touches the public `/informacion` table and the admin `/admin/descuentos-duracion` list | `pnpm playwright test` |
| **Vitest regression** | Full unit suite to ensure helper extraction did not change any existing format output | `pnpm vitest run` |
| **Visual regression (manual)** | `PlansSection` — the `$` separator switches from regular space to non-breaking space (Engram #203). User has pre-accepted this; verify in browser. | Post-apply manual check (apply phase reminder) |

## Risk Register

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| R1 | **E2E selector coupling** — changing the text inside `data-testid="descuento-list-item"` breaks `:has-text("15%")` at `tests/promociones-descuentos.spec.ts:67,267` and `tests/page-objects/DescuentoAdminPage.ts:113-117` | **HIGH** | The `%` literal stays inside the list item text; the new "Precio final" lives in a separate sibling element with its own `data-testid`. Documented in admin-panel delta as a MUST scenario. Apply phase must verify by running the full E2E suite. |
| R2 | **Visual regression on `PlansSection`** — `Intl.NumberFormat` outputs non-breaking space between `$` and number; current code uses regular space. Only site of the 5 migrations that visually changes. | LOW (user pre-accepted) | Engram #203. Apply phase reminder added. No new test required (existing snapshot/E2E covers layout). |
| R3 | **Scope discipline** — drift into `Promocion` business logic, schema migration, new readers, cross-tag invalidation, live preview, or rounding strategy as a PRD feature | MEDIUM | Hard constraints listed in the prompt brief; out-of-scope section below; the design explicitly enumerates 0 new actions / 0 new tags / 0 new schema. Apply phase will reject any PR that adds these. |
| R4 (new) | **Intl locale availability in CI** — Node has `Intl` with `es-AR` locale since v13; CI runner must too. | LOW | Project already uses this pattern in 4 of the 5 migration sites; if it works there, it works for the new helper. Vitest in Node 18+ has full ICU. |
| R5 (new) | **Decimal precision in computation** — `50000 * 0.85 = 42500.00000000001` if not handled. | LOW | `formatPriceARS` uses `maximumFractionDigits: 0` which formats to nearest integer; the arithmetic precision in JS Number is well within ARS scale (no fractional centavos in display). No `toFixed` needed. |

## Out of Scope

- **`Promocion` business logic or `promocion.precio`** — incidental format migration only.
- **Rounding strategy as a PRD-level feature** — implicit `Math.round` via `Intl.NumberFormat`; no explicit `round()` call, no user-facing rounding rule.
- **Cache cross-invalidation between `gym-config` and `descuentos-duracion` tags** — existing per-action revalidation is sufficient.
- **New server actions, new readers, new cache tags, new Prisma columns, schema migration** — zero of any.
- **Live preview in admin form** — no `useWatch`, no recalculation; only after save (locked answer 4B).
- **Mobile-specific redesign** — admin already has its own layout; the new 3rd column inherits the existing `Table` responsiveness.
- **New copy/i18n keys** — strings are inline literals (`"Sin precio configurado"`, `"—"`); if i18n is later required, it gets its own change.
- **I18n of the new column header** — "Precio final" is the locked copy from the spec.

## Open Questions

None. All 5 product answers and 3 technical decisions are locked; the E2E selector constraint is documented; the helper signature is locked. Apply phase can proceed.
