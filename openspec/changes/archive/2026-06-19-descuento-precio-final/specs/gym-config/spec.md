# Delta for Gym Configuration — descuento-precio-final

## ADDED Requirements

### Requirement: Public Duration Discounts Table Adds "Precio final" Column

The `DurationDiscountsSection` table on `/informacion` MUST add a third column titled "Precio final" alongside the existing "Duración" and "Descuento" columns. The new column MUST display the computed final price per row (`gym.price * (1 - porcentaje/100)`), formatted by `formatPriceARS` from `src/lib/format.ts` (see Shared `formatPriceARS` Helper). The column MUST be present regardless of `gym.price` being null — the null case renders the literal `"—"` per the decision below.

#### Scenario: Public table shows computed final price per row when gym.price is set

- GIVEN `gym.price = 33333` and a `DescuentoDuracion` with `porcentaje = 7`
- WHEN the public table renders
- THEN the rendered row MUST contain a third cell with the formatted price (e.g. `"$ 31.000"`)
- AND the existing "Duración" and "Descuento" cells MUST continue to render unchanged
- AND the new cell MUST expose `data-testid="dur-discount-precio-final"` for testability

#### Scenario: Public table shows "—" when gym.price is null

- GIVEN `gym.price === null`
- WHEN the public table renders
- THEN the "Precio final" column MUST remain visible (column MUST NOT be hidden)
- AND every row in that column MUST render the literal text `"—"`
- AND the table header MUST continue to display "Precio final"
- AND the application MUST NOT throw and MUST NOT display a fake or estimated price

Decision: the column stays visible with `"—"` rather than hidden, because dynamic visibility causes layout shift and inconsistent cell counts; `"—"` is the conventional "not applicable" marker in data tables and keeps the table shape stable for tests and assistive technology.

#### Scenario: Header row reflects the new column

- GIVEN the public table renders
- WHEN the table header renders
- THEN the header MUST contain exactly three `<TableHead>` elements in this order: "Duración", "Descuento", "Precio final"
- AND the new "Precio final" `<TableHead>` MUST be right-aligned (matching the existing "Descuento" cell alignment)

#### Scenario: Public page passes the price to the section

- GIVEN the public page `src/app/(public)/informacion/page.tsx` renders
- WHEN the server page resolves
- THEN it MUST pass the value returned by `getGymPrice()` to `DurationDiscountsSection` as a new `price: number | null` prop
- AND it MUST NOT introduce a new server action, reader, or cache tag (the existing `revalidateTag("gym-config")` invalidation surface is sufficient)

### Requirement: Public App Migrates Local formatPrice Duplicates

`src/components/informacion/PlansSection.tsx` and `src/components/informacion/PriceSection.tsx` MUST use `formatPriceARS` from `src/lib/format.ts` and MUST remove their local `formatPrice` or `formatPriceARS` definitions. One acknowledged visual shift is allowed: `PlansSection` MAY change from a manually prefixed `"$ 45.000"` (regular space) to the `Intl.NumberFormat` rendering (non-breaking space). This is the only intended visual shift of the 5-site format migration and warrants a post-apply visual check.

#### Scenario: PlansSection and PriceSection use the shared helper

- GIVEN either component formats a price for display
- WHEN the component renders
- THEN the price MUST be formatted by `formatPriceARS` from `src/lib/format.ts`
- AND no local `formatPrice` or `formatPriceARS` definition SHALL remain in either file

### Requirement: Shared formatPriceARS Helper (precondition)

`formatPriceARS(value: number | string): string` MUST be exported from `src/lib/format.ts`, using `Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 })`. It MUST be the single source of truth for ARS currency formatting across the public app and the admin panel. This is a precondition for both deltas of this change.

#### Scenario: Helper formats a positive number and accepts mixed inputs

- GIVEN `formatPriceARS(45000)` is called
- THEN it MUST return a non-empty ARS-formatted string matching the es-AR currency convention (e.g. `"$ 45.000"` or `"$45.000"`)
- AND the value MUST include a peso sign, thousand separators, and no decimal places (the `maximumFractionDigits: 0` choice absorbs float noise such as `50000 * 0.9 = 45000.000000001`)
- AND it MUST return a formatted ARS string without throwing when called with a number, a numeric string, or a stringified decimal
