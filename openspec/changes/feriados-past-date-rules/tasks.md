# Tasks: Feriados Past Date Rules

## Implementation Order

**Phase 1 (Sequential)**: T1 — Foundation utility
**Phase 2 (Parallel)**: T2, T3 — Validation layers
**Phase 3 (Parallel)**: T4, T5, T6 — UI filtering and hints

---

## T1: Add `getToday()` to `src/lib/dates.ts`

**Dependency**: None (foundation)

- [ ] Create `getToday()` function using local date (NOT UTC, NOT toISOString)
- [ ] Return format: `YYYY-MM-DD` string
- [ ] Export for use by other modules
- [ ] Verify lexicographic string comparison works for `>=` / `<` comparisons

```ts
export function getToday(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
```

---

## T2: Add Zod refinement to `src/lib/schemas.ts`

**Dependency**: T1 must be completed first

- [ ] Import `getToday` from `~/lib/dates`
- [ ] Add `.refine()` to `createFeriadoSchema` for `fecha >= getToday()`
- [ ] Add `.refine()` to `updateFeriadoSchema` for `fecha >= getToday()`
- [ ] Error message: `"No se pueden seleccionar fechas pasadas"`
- [ ] Use `path: ["fecha"]` to show error on specific field
- [ ] Verify error appears inline on form field

```ts
.refine(
  (data) => data.fecha >= getToday(),
  { message: "No se pueden seleccionar fechas pasadas", path: ["fecha"] }
)
```

---

## T3: Add server action validation in `src/app/actions/feriados.ts`

**Dependency**: T1 must be completed first

- [ ] Import `getToday` from `~/lib/dates`
- [ ] Add check in `createFeriado`: if `fecha < getToday()` return error 400
- [ ] Add check in `updateFeriado`: if `fecha < getToday()` return error 400
- [ ] Error message: `"No se pueden crear feriados en fechas pasadas"`
- [ ] Return format: `{ error: string, statusCode: number }`
- [ ] Place check after parsing, before DB write

```ts
const today = getToday()
if (fecha < today) {
  return { error: "No se pueden crear feriados en fechas pasadas", statusCode: 400 }
}
```

---

## T4: Filter public page `src/app/(public)/feriados/page.tsx`

**Dependency**: T1 must be completed first

- [ ] Import `getToday` from `~/lib/dates`
- [ ] Filter holidays: `feriados.filter(f => f.fecha >= getToday())`
- [ ] Use filtered list for rendering (not the original `feriados` array)
- [ ] Verify past holidays are hidden from public view

```ts
const today = getToday()
const feriadosVisibles = feriados.filter(f => f.fecha >= today)
```

---

## T5: Filter public page `src/app/(public)/informacion/page.tsx`

**Dependency**: T1 must be completed first

- [ ] Import `getToday` from `~/lib/dates`
- [ ] Apply same filter pattern in preview section: `feriados.filter(f => f.fecha >= getToday())`
- [ ] Do NOT filter admin-only sections (if any)
- [ ] Verify preview section shows only today+future holidays

```ts
const today = getToday()
const feriadosVisibles = feriados.filter(f => f.fecha >= today)
```

---

## T6: Update admin component `src/components/admin/feriado-manager.tsx`

**Dependency**: T1 must be completed first

- [ ] Import `getToday` from `~/lib/dates`
- [ ] Add `min={getToday()}` to date input (UX hint, not enforcement)
- [ ] Add submit validation: if `fecha < getToday()` show toast and return early
- [ ] Do NOT filter the holiday list (admin sees ALL holidays, including past)
- [ ] Verify admin can still view and manage past holidays

```tsx
<Input type="date" min={getToday()} ... />
```

---

## Verification Checklist

After all tasks completed:

- [ ] TypeScript compiles without errors
- [ ] ESLint passes
- [ ] `getToday()` returns correct `YYYY-MM-DD` in local time
- [ ] Create holiday with past date → Zod error + server action rejects
- [ ] Create holiday with today → succeeds
- [ ] Create holiday with future → succeeds
- [ ] Update holiday to past date → blocked
- [ ] `/feriados` shows only today+future holidays
- [ ] `/informacion` preview shows only today+future holidays
- [ ] Admin Holiday Manager shows ALL holidays (no filter)
- [ ] Past holidays remain in database (not deleted)
