# Design: Feriados Past Date Rules

## Overview

Implementation design for blocking past-date holidays at entry points (Zod + server actions) and filtering them from public views while preserving admin access to all records.

---

## 1. Code Changes by File

### `src/lib/dates.ts`

**Purpose**: Single source of truth for current date, avoiding DRY violations.

```ts
export function getToday(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
```

**Rationale**: Returns `YYYY-MM-DD` string using local time. String lexicographic comparison (`>=`, `<`) works correctly for same-format ISO date strings.

---

### `src/lib/schemas.ts`

**Purpose**: User-facing validation (UX layer) — blocks past dates in forms.

Add to both `createFeriadoSchema` and `updateFeriadoSchema`:

```ts
.refine(
  (data) => data.fecha >= getToday(),
  { message: "No se pueden seleccionar fechas pasadas", path: ["fecha"] }
)
```

**Import required**:
```ts
import { getToday } from "~/lib/dates"
```

**Rationale**: `.refine()` runs after base schema validation. Error message is user-friendly and displayed inline on the form field.

---

### `src/app/actions/feriados.ts`

**Purpose**: Security layer — prevents bypass via curl/API.

In `createFeriado` action, after parsing but before DB write:
```ts
const today = getToday()
if (fecha < today) {
  return { error: "No se pueden crear feriados en fechas pasadas", statusCode: 400 }
}
```

Same check in `updateFeriado` action.

**Return type**: `{ error: string, statusCode: number }`

**Rationale**: Server actions are the actual DB write entry point. Zod alone can be bypassed (e.g., via direct API calls). This ensures enforcement at the security boundary.

---

### `src/app/(public)/feriados/page.tsx`

**Purpose**: Public list — show only today+future holidays.

```ts
const today = getToday()
const feriadosVisibles = feriados.filter(f => f.fecha >= today)
```

**Rationale**: Purely presentational filter. No server-side change needed — data fetching remains unchanged, filtering happens in component.

---

### `src/app/(public)/informacion/page.tsx`

**Purpose**: Preview section on information page — same filter pattern.

```ts
const today = getToday()
const feriadosVisibles = feriados.filter(f => f.fecha >= today)
```

**Rationale**: Consistency with `/feriados` page. Preview section should not show outdated holiday info.

---

### `src/components/admin/feriado-manager.tsx`

**Purpose**: Admin date input — UX hint for valid selection.

```tsx
<input type="date" min={getToday()} />
```

**No filter applied** to the holiday list — admin sees ALL records including past.

**Rationale**: Admin may need to view/edit historical holidays. The `min` attribute is a UX hint only; actual validation happens via Zod schema + server action.

---

## 2. Error Handling Strategy

| Layer | Mechanism | Error Format |
|-------|-----------|--------------|
| Zod validation | `.refine()` in schema | Field-level error on `fecha`: "No se pueden seleccionar fechas pasadas" |
| Server action | Explicit `if` check | `{ error: "...", statusCode: 400 }` |

**Client component handling**: React Hook Form displays Zod errors via `formState.errors`. Server action errors handled separately (typically via toast or form-level error display).

---

## 3. Import Strategy

All consumer files import from central location:

```ts
import { getToday } from "~/lib/dates"
```

**Files requiring import**:
- `src/lib/schemas.ts`
- `src/app/actions/feriados.ts`
- `src/app/(public)/feriados/page.tsx`
- `src/app/(public)/informacion/page.tsx`
- `src/components/admin/feriado-manager.tsx`

---

## 4. No Changes Required

| Area | Reason |
|------|--------|
| Database schema | No migration needed — past holidays remain in DB |
| API routes | Server actions handle enforcement |
| Admin list view | No filter — admin sees all holidays |

---

## 5. File Summary

| File | Change Type | Lines Modified |
|------|-------------|----------------|
| `src/lib/dates.ts` | Add function | +7 |
| `src/lib/schemas.ts` | Add `.refine()` | +4 per schema |
| `src/app/actions/feriados.ts` | Add validation | +4 per action |
| `src/app/(public)/feriados/page.tsx` | Add filter | +2 |
| `src/app/(public)/informacion/page.tsx` | Add filter | +2 |
| `src/components/admin/feriado-manager.tsx` | Add `min` attr | +1 |

---

## 6. Testing Approach

### Manual Verification Steps

1. **Block past dates in create**
   - Go to Admin Holiday Manager
   - Set date to yesterday
   - Submit → Zod error shown, no DB write

2. **Allow today/future in create**
   - Set date to today → succeeds
   - Set date to next week → succeeds

3. **Public page filters**
   - Visit `/feriados` → past holidays hidden
   - Visit `/informacion` → past holidays hidden in preview

4. **Admin sees all**
   - Visit `/admin/feriados` → all holidays visible including past

5. **Update to past blocked**
   - Edit existing holiday → change date to past
   - Submit → validation error, date unchanged

---

## 7. Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| String comparison timezone issues | Low | `getToday()` uses local time consistently; string comparison handles ISO format correctly |
| `fecha === hoy` edge case | Low | Uses `>=` comparison — today is allowed |
| Zod bypass | Low | Server action is the real security boundary |
| Admin confusion seeing past holidays | Low | Intentional — admin needs full access |

---

## 8. Dependencies

- None — additive changes only, no new packages

---

## 9. Rollback Instructions

1. Remove `getToday()` from `src/lib/dates.ts` (or retain if useful elsewhere)
2. Remove `.refine()` blocks from `createFeriadoSchema` and `updateFeriadoSchema` in `src/lib/schemas.ts`
3. Remove explicit `if (fecha < getToday())` checks from `createFeriado` and `updateFeriado` in `src/app/actions/feriados.ts`
4. Remove `.filter()` calls from public pages
5. Remove `min={getToday()}` from `feriado-manager.tsx`
6. No DB migration — past holidays reappear in public views automatically
