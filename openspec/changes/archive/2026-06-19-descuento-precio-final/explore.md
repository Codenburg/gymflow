# Exploration: descuento-precio-final

**Change**: `descuento-precio-final`
**Topic key**: `feature/descuento-precio-final` (observation #198)
**Artifact store**: hybrid (OpenSpec + Engram)
**Strict TDD**: true (relevant for apply phase; explore is read-only)
**Review budget**: 400 lines

## Current State

### What the two UIs render today

**Admin panel** — `src/components/admin/descuento-duracion-manager.tsx`
- Lines 347–362: each list item shows only the months label (`3 meses`) and a single green percent chip (`Descuento del 10%`). No money anchor.
- Lines 189–328: the create/edit form uses **plain `useState`** (`meses`, `porcentaje`, `error`) — **NOT react-hook-form**. The form is already client-local state, so any derived number is trivially computable in-render.
- Server page `src/app/(admin)/admin/descuentos-duracion/page.tsx` (17 lines): fetches **only** `getDescuentos()` and passes `initialDescuentos` to the client component. It does **NOT** fetch `getGymPrice()` today.
- Form is `data-testid="descuento-list-item"` per item, with inner `descuento-porcentaje-input`, `descuento-min-meses-input`, `descuento-submit-button`, `descuento-delete-button`.

**Public info page** — `src/components/informacion/DurationDiscountsSection.tsx`
- Lines 38–67: a 2-column `Table` — `Duración` | `Descuento` (which only renders `{descuento.porcentaje}%`). No price column.
- Marked `"use client"` (line 1) but only for the table primitive — the component itself could be a server component; the `"use client"` is incidental.
- Server page `src/app/(public)/informacion/page.tsx` lines 70–76 already does `Promise.allSettled([getGymDisplayForServer(), getGymPrice(), getPromociones(), getDescuentos()])` — so `price` is already plumbed to this page; only passing it to `DurationDiscountsSection` is new.

### Data layer — cached readers (Next.js 16 `use cache` + `cacheTag` + `cacheLife`)

- `src/lib/gym-price.ts` — `getGymPrice()`: `'use cache'`, `cacheTag("gym-config")`, `cacheLife({ revalidate: 60 })`. Returns `number | null` (null distinguished from 0).
- `src/lib/descuentos.ts` — `getDescuentos()`: `'use cache'`, `cacheTag("descuentos-duracion")`, `cacheLife({ revalidate: 60 })`. Returns `DescuentoDuracion[]` ordered by `meses asc`. No `activo` filter (no such field in schema).
- `src/lib/promociones.ts` — `getPromociones()`: `'use cache'`, `cacheTag("promociones")`. Out of scope (see Q6 below).

### Schema — `prisma/schema.prisma`

- `Gym` model (lines 176–197): `price Decimal @db.Decimal(10, 2)` — bounded to 2 decimals at the DB layer. The `descuentosDuracion DescuentoDuracion[]` relation is present (line 196) but unused by readers (no `include`).
- `DescuentoDuracion` model (lines 229–238): `meses Int`, `porcentaje Int` (whole number 0-100, validated by Zod in `src/lib/schemas.ts:321`). **No `precio` field, no `activo` field, no `precioFinal` field.**
- `Promocion` model (lines 217–227): `precio Int` — absolute price. Confirmed unrelated to base price.

### Existing invalidation surface

- `src/app/actions/descuentos-duracion.ts` lines 100-103, 145-148, 175-178: every mutation does `revalidateTag("descuentos-duracion", "max")` + `revalidatePath("/admin/descuentos-duracion")` + `revalidatePath("/precios")`. **Does not touch `gym-config`.**
- `src/app/actions/gym.ts` lines 192-198, 268-272: `updateGymPrice` and `updateGymField` both do `revalidateTag("gym-config", "max")` + `revalidatePath("/informacion")` + `revalidatePath("/admin")` (+ `/` for the field version). **Does not touch `descuentos-duracion`.**

### E2E tests that constrain the layout

- `tests/promociones-descuentos.spec.ts` lines 67, 246-249, 267: relies on `[data-testid="descuento-list-item"]:has-text("15%")` — the `%` must stay adjacent to the percentage number inside the list item.
- `tests/pages/DescuentoAdminPage.ts` lines 17, 113-117: same selector contract — list item matched by `%` substring.
- No file `tests/descuentos.spec.ts` exists (orchestrator guessed — actual file is `promociones-descuentos.spec.ts`).
- `tests/cache-invalidation.spec.ts` covers cache behavior on the homepage and `/informacion` but **not** specifically the cross-invalidation between `gym-config` and `descuentos-duracion`. There is no current test asserting what happens after price change in `/admin/descuentos-duracion`.

## Gotchas Discovered

1. **`formatPriceARS` is NOT a shared utility.** It's defined **locally in 4 different files** with two incompatible implementations:
   - `src/components/informacion/PlansSection.tsx:5` — `const formatPriceARS = (n) => `$ ${Number(n).toLocaleString("es-AR")}` — strips decimals, prepends `$ ` literally.
   - `src/components/informacion/PriceSection.tsx:8-13`, `src/components/admin/GymPriceEditor.tsx:40-45`, `src/components/admin/promocion-form.tsx:30`, `src/components/admin/promocion-card.tsx:18` — all use `new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" })` which produces a locale-correct currency string (usually `$ 45.000,00` in es-AR).
   - The roadmap says "reuse `formatPriceARS()`" — that text is misleading because there is no canonical utility to reuse. The proposal phase must pick ONE convention (recommend: extract a `src/lib/format.ts` and standardize on `Intl.NumberFormat` to match `PriceSection`, which is the sibling that already shows `gym.price`).

2. **Admin descuentos page does not currently fetch `getGymPrice()`.** The admin page only reads `getDescuentos()`. The feature requires adding the price fetch + prop pass-through, which is a real (small) surface change to the server page — not just a UI tweak inside the client component.

3. **Cached readers compose at render time, not at cache time.** Because `use cache` + `cacheTag` are per-resource, the descuento list (tag `descuentos-duracion`) and the price (tag `gym-config`) are cached independently and combined at render. **No cross-tag invalidation is required** for the feature to work correctly — each action already invalidates its own tag, and the render-time computation picks up fresh values automatically. The 60s TTL is a safety net only.

4. **`Gym.price` is `Decimal(10,2)` (DB) → `Number` (reader).** `getGymPrice()` returns `Number(gym.price)` (line 29 of `gym-price.ts`). The math is `Number(price) * (1 - porcentaje/100)`, where `porcentaje` is an `Int`. With both operands being numbers, the result is a JS number — no Decimal arithmetic needed at the JS layer. Prisma's `Decimal` type never reaches the UI.

5. **No `Math.round` / rounding helper exists in `src/lib/`.** Project-wide grep found only 3 uses of `Math.ceil` and 0 of `Math.floor` / `Math.round` / `toFixed` for prices. There is no rounding convention to inherit — the proposal phase must define one. Round-strategy options are wide open.

6. **Form is plain `useState`, not RHF.** `descuento-duracion-manager.tsx` does **NOT** import `react-hook-form` (confirmed by grep). Live preview is therefore trivial: any derived number can be computed inline from the existing `porcentaje` and `meses` state. **No structural change is needed for live preview** — it's just a JS expression in JSX. Migrating to RHF would be a much bigger change with no benefit for this feature.

7. **`Decimal` boundary already handled.** `getGymDisplayForServer` (lines 110-134 of `gym.ts`) explicitly chose to project only narrow fields to avoid leaking `Decimal` across the server→client boundary. `getGymPrice` returns `Number`, so the consumer side never touches `Decimal`. No new boundary concern introduced.

8. **Test selector coupling.** Both `promociones-descuentos.spec.ts:67,267` and `tests/pages/DescuentoAdminPage.ts:113-117` match list items with `[data-testid="descuento-list-item"]:has-text("15%")`. As long as the literal substring `15%` remains somewhere inside the list item (even wrapped in another `<span>`), the selector still works. The proposal phase must NOT remove the `%` literal next to the percentage number.

## Impacted Files

| File | What changes |
|------|-------------|
| `src/app/(admin)/admin/descuentos-duracion/page.tsx` | Add `getGymPrice()` to the awaited calls; pass `gymPrice` as new prop `initialGymPrice` to `DescuentoDuracionManager`. |
| `src/components/admin/descuento-duracion-manager.tsx` | Extend `DescuentoDuracionManagerProps` with `initialGymPrice: number \| null`; render computed "Precio final" inside each list item (lines 351-361) and optionally as a live-preview hint next to the percentage input in the create/edit form (around lines 229-244, 300-314). Add new `data-testid="descuento-precio-final"` for testability of the new element (recommended). |
| `src/app/(public)/informacion/page.tsx` | Plumb `price` (already fetched at line 73) to `DurationDiscountsSection` — currently passed only to `PriceSection` at line 124. Add a new prop to the section. |
| `src/components/informacion/DurationDiscountsSection.tsx` | Extend props with `price: number \| null`; add a third column "Precio final" to the table; render computation when `price !== null`, render `—` or omit when null. Mark needs new `data-testid` (e.g. `dur-discount-precio-final`). |
| `src/lib/format.ts` (new, optional) | If proposal decides to extract `formatPriceARS` to standardize — currently each file defines its own. Otherwise no new lib file. |
| `tests/promociones-descuentos.spec.ts` | Optionally add a scenario verifying the calculated price appears when `gym.price` is set. Selector for list item still works as long as `%` stays adjacent. |

## Dependencies

- **Prisma migration**: NO. Schema is unchanged.
- **New server action**: NO. Mutations are unchanged.
- **New reader**: NO. `getGymPrice()` and `getDescuentos()` already exist and are already used (in the public page).
- **New env var**: NO.
- **New package**: NO.

The only structural change is **one extra prop** passed from each of two server pages to two client components, and the new render logic inside those two components.

## Open Questions With Codebase Evidence

### Q1 — UX pattern

**Evidence (admin list item today, lines 351-361 of `descuento-duracion-manager.tsx`):**
```tsx
<div>
  <p className="text-foreground font-medium">{getMesesLabel(descuento.meses)}</p>
  <p className="text-muted-foreground text-sm">
    Descuento del{" "}
    <span className="text-emerald-600 font-medium">{descuento.porcentaje}%</span>
  </p>
</div>
```
**Evidence (public table today, lines 41-65 of `DurationDiscountsSection.tsx`):**
```tsx
<TableHeader>
  <TableHead>Duración</TableHead>
  <TableHead className="text-right">Descuento</TableHead>
</TableHeader>
<TableCell className="text-right font-semibold">{descuento.porcentaje}%</TableCell>
```
**Evidence (sibling components with price display):**
- `PriceSection.tsx:40-43` — big `text-4xl font-bold` headline for the base price.
- `PlansSection.tsx:46-48` — small `Badge` with primary-tinted background.
- `promocion-card.tsx:55-62` — `text-2xl font-bold` inside a Card.

There is **no existing strikethrough pattern** in the project (grep for `line-through` returns nothing relevant). The visual language for price display is bold + colored — not strikethrough. The proposal phase should pick from: (a) new second line under the discount (matches admin layout), (b) 3rd column in table (matches public layout), (c) chip next to the %. The roadmap's recommendation (a)+(b) is consistent with the existing visual grammar but is a UX call, not an evidence call.

### Q2 — `gym.price === null` handling

**Evidence (`PriceSection.tsx:15-33`):**
```tsx
if (error || price === null) {
  return (
    <section ...>
      <h2>Precio</h2>
      <div className="flex items-center gap-2">
        <p className="text-2xl font-bold text-muted-foreground">No disponible</p>
        <AlertCircle className="w-4 h-4 text-destructive" />
      </div>
      ...
```
**Evidence (`GymPriceEditor.tsx:114-116`):**
```tsx
) : (
  <p className="text-muted-foreground">Sin precio configurado</p>
)}
```
**Evidence (`informacion/page.tsx:96`):** `const price = gymPriceResult.status === "fulfilled" ? gymPriceResult.value : null;` — null propagates cleanly to the section.
**Evidence (`descuentos.ts:21-34`):** the reader returns `[]` on error, never null. Descuentos list is always renderable.
**Evidence (`gym-price.ts:30-33`):** returns `null` on error too.

Conclusion: there are TWO existing patterns for the `null` price case (a full "No disponible" section, and a terse "Sin precio configurado" string). The proposal must decide which one applies to the new column / row. Most likely answer: when `price === null`, **render the discount as today** (just the `%`) and skip the new money render. The roadmap agrees with this.

### Q3 — Round strategy

**Evidence:** No `Math.round`, `Math.floor`, `toFixed` (for prices), or rounding helper exists anywhere in `src/lib/`. Project-wide grep for rounding functions only finds 3 hits, all `Math.ceil` for pagination (`rutinas-list-client.tsx:316`, `api/rutinas/route.ts:148`, `app/(public)/page.tsx:124`) — zero relevance to currency.

**Evidence (`gym.ts:140-149`):** the price Zod schema caps at 2 decimals (`.refine((v) => Number(v.toFixed(2)) === v)`). So `Gym.price` is at most `$X.XX`.

**Evidence (`schema.prisma:178`):** DB column is `Decimal(10, 2)` — stored to 2 decimals.

**Math profile**: `Math.floor(price * (1 - porcentaje/100))` gives a result with up to 2 decimals; with `Decimal(10,2)` inputs, the computation `price * pct/100` is bounded to `(max $500.000 * 100/100) = $500.000`, never overflows JS number precision. For 10% off $50.000 = $45.000 (exact). For 33% off $45.000 = $30.150 (exact). For 7% off $33.333 = $2.333,31 (non-integer).

There is **no inherited convention**. The proposal must pick: (a) `Math.round` (banker's-friendly, standard), (b) `Math.floor` (gym-favors-penny undercount), (c) round to nearest $100/$1000 (visual rounding, hides sub-dollar precision). The most likely answer given the visual context (no decimals shown in `PlansSection`) is **(c) round to nearest integer ARS** with `Intl.NumberFormat` displaying no decimals — matches existing pattern.

### Q4 — Cache invalidation cross-tag

**Evidence (today):**
- `actions/descuentos-duracion.ts:100-103` — invalidates tag `descuentos-duracion`, paths `/admin/descuentos-duracion` and `/precios`. **Does NOT touch `gym-config`.**
- `actions/gym.ts:192-198` — `updateGymPrice` invalidates tag `gym-config`, paths `/api/gym`, `/informacion`, `/admin`. **Does NOT touch `descuentos-duracion`.**

**Evidence (architecture):** `getGymPrice()` is `'use cache'` tagged `gym-config`. `getDescuentos()` is `'use cache'` tagged `descuentos-duracion`. They are **independent cache entries**. The composition `price * (1 - %)` happens at render time, not cache time.

**Conclusion**: Cross-invalidation is **NOT needed** for this feature. When admin changes `gym.price`, the `gym-config` tag is invalidated → `getGymPrice()` re-fetches → all pages that consume `getGymPrice()` (now including `/admin/descuentos-duracion` after this feature) re-render with the new price. The 60s `cacheLife` is the safety net. The descuento list itself is unchanged by a price update, so it stays in its own cache. Conversely, a descuento mutation does not need to invalidate the price cache — adding/editing a descuento doesn't change `gym.price`.

The proposal phase should NOT recommend any change to invalidation surface; both actions are correct as-is.

### Q5 — Live preview in admin

**Evidence:** `descuento-duracion-manager.tsx` imports are (line 1-15):
```tsx
"use client";
import { useState } from "react";
import { toast } from "sonner";
import { createDescuentoDuracion, updateDescuentoDuracion, deleteDescuentoDuracion } from "@/app/actions/descuentos-duracion";
import { AdminCard } from "@/components/admin/admin-card";
import { AdminFormField } from "@/components/admin/admin-form-field";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/hooks/use-confirm";
import { Plus, Percent, Trash2, Edit2, X, Check } from "lucide-react";
import type { FormState } from "@/lib/schemas";
```
**`react-hook-form` is NOT imported.** Form state is plain `useState` (lines 44-46):
```tsx
const [meses, setMeses] = useState<number>(3);
const [porcentaje, setPorcentaje] = useState<string>("");
const [error, setError] = useState<string | null>(null);
```

**Conclusion**: Live preview is **trivial** — the existing `porcentaje` string state plus a derived `price * (1 - parseInt(porcentaje || '0') / 100)` JSX expression is enough. No `useWatch`, no RHF migration, no state lift. The "live preview" question is settled by the existing architecture: it's free. The proposal should embrace live preview without restructuring.

The only edge case: while editing, `meses` is a controlled `<select>` with `value={meses}` — also state. So the preview can be wired off `(meses, porcentaje)` without ceremony.

### Q6 — Scope (Promocion vs DescuentoDuracion)

**Evidence (`schema.prisma:217-227`):**
```prisma
model Promocion {
  id          String   @id @default(uuid())
  titulo      String
  descripcion String
  precio      Int      // ABSOLUTE — no % applied
  activo      Boolean  @default(true)
  ...
}
```
**Evidence (`promociones.ts:19-31`):** `getPromociones()` returns the full row with `precio` as-is.
**Evidence (`promocion-form.tsx`):** admin enters an absolute price (no `porcentaje` field anywhere on Promocion).
**Evidence (`PlansSection.tsx:47`):** renders `{formatPriceARS(promocion.precio)}` — the literal stored value, no computation.

**Conclusion**: `promocion.precio` is absolute and NOT derived from `gym.price`. The feature applies **only to `DescuentoDuracion`**. No new logic touches `Promocion`. Scope is correctly bounded as the roadmap says.

### Q7 — `formatPriceARS` reuse

**Evidence — there is NO shared utility. Four local definitions exist:**

1. `src/components/informacion/PlansSection.tsx:5`:
   ```tsx
   const formatPriceARS = (n: string | number) => `$ ${Number(n).toLocaleString("es-AR")}`
   ```
   Output for `45000`: `"$ 45.000"` (no decimals).

2. `src/components/informacion/PriceSection.tsx:8-13`:
   ```tsx
   function formatPrice(price: number): string {
     return new Intl.NumberFormat("es-AR", {
       style: "currency",
       currency: "ARS",
     }).format(price)
   }
   ```
   Output for `45000`: `"$ 45.000,00"` (es-AR currency style with decimals).

3. `src/components/admin/GymPriceEditor.tsx:40-45`: identical to #2 (Intl currency).
4. `src/components/admin/promocion-form.tsx:30` and `src/components/admin/promocion-card.tsx:18`: identical to #2.

**Conclusion**: The roadmap's claim that "el formato `formatPriceARS()` ya existe" is misleading — there are two conventions and the one named `formatPriceARS` is the simpler (no-decimal) variant. The proposal must choose:
- **(a) Standardize on `Intl.NumberFormat`** matching `PriceSection`/`GymPriceEditor` (consistent with the base-price render that the new "precio final" is being shown next to). Recommendation: extract to `src/lib/format.ts` as `formatPriceARS(n: number): string`.
- **(b) Use the local `formatPriceARS` from `PlansSection.tsx`** — inconsistent with the base-price visual style; would make `Descuento del 10% · $45.000` look different from `Precio base $45.000,00` next to it.

The proposal should pick (a) and either (i) extract to `src/lib/format.ts` (one-time refactor, small surface) or (ii) inline-duplicate in the two new render sites (matches existing duplication).

## Design Constraints

1. **Server + client compatibility.** Both the admin `DescuentoDuracionManager` and the public `DurationDiscountsSection` already run as `"use client"` (the admin one for form state, the public one incidental). The computation can happen client-side after the server passes `gymPrice` as a prop. **No `Decimal` should cross the server→client boundary** (the existing pattern already returns `Number`, see `gym-price.ts:29`).

2. **Preserve all existing `data-testid` selectors.** Tests `tests/promociones-descuentos.spec.ts:67,246-249,267` and `tests/pages/DescuentoAdminPage.ts:113-117` rely on `[data-testid="descuento-list-item"]:has-text("15%")`. The literal `15%` must remain inside the list item as a single text node (or a `has-text` will still match even if split across elements — Playwright's `has-text` is substring-based). To be safe, **keep the `%` adjacent to the number** in the same span/text.

3. **No new testids that conflict.** The proposal may add `descuento-precio-final` and `dur-discount-precio-final`, but must NOT remove any of the existing 4 `descuento-*-input/button/testid` identifiers or rename the list item testid.

4. **`strict_tdd: true` for apply.** When this reaches the apply phase, every component-level change should be backed by a Vitest unit test (calculator pure function) and the E2E test file `tests/promociones-descuentos.spec.ts` should gain a scenario for the new visible money render. The existing calculator logic, once extracted to `src/lib/format.ts` or similar, is the natural target for the unit test.

5. **i18n consistency.** All UI copy stays in Rioplatense Spanish (matching project convention; see `openspec/config.yaml` for project locale and existing user-facing strings). User-facing strings include the new label and the strikethrough/arrow text.

6. **`Promise.allSettled` pattern.** The public `informacion/page.tsx` already wraps its reads in `Promise.allSettled` with a `status === "fulfilled"` guard. Adding `price` to `DurationDiscountsSection` props must continue to honor the same pattern (never let `getGymPrice` reject propagate to the page render — it already returns `null` on error per `gym-price.ts:30-33`).

7. **`data-testid` strategy required by project.** `openspec/config.yaml` line 287: `selectors: strategy: data-testid`. Any new interactive element must have a testid.

8. **No new cache tag.** Do NOT introduce a third cache tag like `descuentos-con-precio`. The composition stays at render time.

## Estimated Complexity

**Small** (target ~150–250 changed lines, well within the 400-line review budget).

Reasoning:
- 1 server-page prop addition (admin descuentos page: +1 import, +1 await, +1 prop pass = ~3 lines).
- 1 server-page prop pass-through (informacion page: ~1 line).
- 2 component updates (~50 lines each: extend props interface, add column/row, compute, format).
- Optional: 1 new `src/lib/format.ts` (~10 lines).
- Optional: 1 new unit test for the pure calculator (~30 lines).
- Optional: 1 new E2E scenario in `tests/promociones-descuentos.spec.ts` (~20 lines).

No DB migration. No new server action. No new reader. No new cache tag. No architectural change.

**Forecast for tasks phase**:
- `Decision needed before apply`: No.
- `Chained PRs recommended`: No.
- `400-line budget risk`: Low.

## Recommendation (for proposal phase to consider)

- Add the column/row to both UIs; show `$X.XXX` (integer ARS, `Intl.NumberFormat` with `maximumFractionDigits: 0`) when `price !== null`; show `—` (em-dash) or omit the cell when `price === null`.
- **Do not** introduce a third cache tag. The composition is render-time.
- **Do not** migrate the admin form to react-hook-form. Live preview is trivial with existing `useState`.
- **Do** extract `formatPriceARS` to `src/lib/format.ts` as part of this change — the inconsistency between `PlansSection` and `PriceSection` is a latent bug that this feature should not propagate. One small refactor, scoped, prevents the new code from picking the wrong convention.
- **Do** add a unit test for the pure calculation (`src/lib/format.ts:calcPrecioFinal(base, porcentaje)`) — under `strict_tdd: true`, this is the apply-phase testable surface.

## Ready for Proposal

**Yes** — all 7 open questions have codebase evidence. The proposal phase can resolve each with the data above; no additional exploration needed.

Key signals:
- All 5 skills loaded (`sdd-explore`, `next-best-practices`, `next-cache-components`, `react-hook-form`, `react-19`).
- All high-confidence files read (and beyond where needed: admin page, public page, both cached readers, schema, both action files, the test file + page object, the test cache file).
- 7/7 open questions answered with code snippets.
- 0 dependencies on migrations / new actions / new readers / new packages.
- Complexity is Small (Low risk on the 400-line budget).
