# Delta for Admin Panel — descuento-precio-final

## ADDED Requirements

### Requirement: Descuento List Item Shows Computed Final Price

Each `DescuentoDuracion` list item rendered by `DescuentoDuracionManager` on `/admin/descuentos-duracion` MUST display the computed final price (`gym.price * (1 - porcentaje/100)`) alongside the existing discount percent, formatted by `formatPriceARS` from `src/lib/format.ts` (see Shared `formatPriceARS` Helper).

#### Scenario: List item shows computed final price when gym.price is set

- GIVEN `gym.price = 50000` and a `DescuentoDuracion` with `porcentaje = 10`
- WHEN the admin list item renders
- THEN the rendered output MUST contain a sibling element showing the formatted price (e.g. "$ 45.000")
- AND the existing percent chip (`10%`) MUST continue to render unchanged

#### Scenario: List item shows "Sin precio configurado" when gym.price is null

- GIVEN `gym.price === null`
- WHEN the admin list item renders
- THEN the rendered output MUST contain the literal text "Sin precio configurado"
- AND the existing percent chip MUST continue to render unchanged
- AND the application MUST NOT throw and MUST NOT display a fake or estimated price

#### Scenario: Percent literal stays adjacent to the number inside the list item

- GIVEN any list item with `porcentaje = 15`
- WHEN the list item renders
- THEN the literal substring `15%` MUST remain inside the element matched by `[data-testid="descuento-list-item"]`
- AND the new computed-price element MUST be a separate sibling node (not part of the same text node as the `%` literal)
- AND the existing E2E selectors `tests/promociones-descuentos.spec.ts:67,267` and `tests/pages/DescuentoAdminPage.ts:113-117` filtering by `:has-text("15%")` MUST continue to match without modification

#### Scenario: Computed-price element is testable

- GIVEN a list item is rendered with `gym.price` set OR `gym.price === null`
- WHEN the element is shown
- THEN it MUST expose `data-testid="descuento-precio-final"` in both cases

#### Scenario: Admin page fetches gym price

- GIVEN the server page `src/app/(admin)/admin/descuentos-duracion/page.tsx` renders
- WHEN the server page resolves
- THEN it MUST call `getGymPrice()` alongside the existing `getDescuentos()` call
- AND it MUST pass the resolved value as a new `initialGymPrice: number | null` prop to `DescuentoDuracionManager`
- AND it MUST NOT introduce a new server action, reader, cache tag, or revalidation surface (the existing `revalidateTag("descuentos-duracion")` and `revalidateTag("gym-config")` remain sufficient)

### Requirement: Admin Panel Migrates Local formatPrice Duplicates

The three admin components below MUST use `formatPriceARS` from `src/lib/format.ts` and MUST remove their local `formatPrice` or `formatPriceARS` definitions. The migration in `promocion-form.tsx` and `promocion-card.tsx` is incidental to the helper swap; it MUST NOT introduce any `Promocion` business-logic changes.

#### Scenario: promocion-form, promocion-card, and GymPriceEditor use the shared helper

- GIVEN `src/components/admin/promocion-form.tsx`, `src/components/admin/promocion-card.tsx`, and `src/components/admin/GymPriceEditor.tsx` each format a price for display
- WHEN any of these components renders
- THEN the price MUST be formatted by `formatPriceARS` from `src/lib/format.ts`
- AND no local `formatPrice` or `formatPriceARS` definition SHALL remain in any of the three files
- AND no pre-existing user-visible formatting behavior SHALL be lost

### Requirement: Shared formatPriceARS Helper (precondition)

`formatPriceARS(value: number | string): string` MUST be exported from `src/lib/format.ts`, using `Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 })`. It MUST be the single source of truth for ARS currency formatting across both the admin panel and the public app. No other requirement in either delta of this change SHALL be implemented before this helper exists at the agreed module path.

#### Scenario: Helper formats a positive number and accepts mixed inputs

- GIVEN `formatPriceARS(45000)` is called
- THEN it MUST return a non-empty ARS-formatted string matching the es-AR currency convention (e.g. `"$ 45.000"` or `"$45.000"`)
- AND the value MUST include a peso sign, thousand separators, and no decimal places (the `maximumFractionDigits: 0` choice absorbs float noise such as `50000 * 0.9 = 45000.000000001`)
- AND it MUST return a formatted ARS string without throwing when called with a number, a numeric string, or a stringified decimal
