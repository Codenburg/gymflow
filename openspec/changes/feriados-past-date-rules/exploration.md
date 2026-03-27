# Exploration: feriados-past-date-rules

## Current State

The system currently has NO validation for past dates on holidays. Both rules requested are **missing completely**:

1. **Block creation/update**: No validation exists in Zod schemas or server actions
2. **Hide past holidays in UI**: All holidays are displayed regardless of date

## Affected Areas

### Backend - Validation Layer

- **`src/lib/schemas.ts`** (lines 119-183) — `createFeriadoSchema` and `updateFeriadoSchema` only validate:
  - `fecha` is non-empty string
  - Time logic when `todo_dia=false`
  - NO past date validation

- **`src/app/actions/feriados.ts`** (lines 47-122, 128-228) — `createFeriado` and `updateFeriado`:
  - Uses Zod validation
  - Checks for duplicates
  - NO date comparison against today

- **`src/app/api/feriados/route.ts`** (lines 97-151, 188-278) — POST and PATCH handlers:
  - Same pattern: Zod validation + duplicate check
  - NO past date validation

### Backend - Data Model

- **`prisma/schema.prisma`** (lines 184-196) — `Feriado` model:
  - `fecha: String` — YYYY-MM-DD format (calendar date, NOT timestamp)
  - No database-level date constraints

### Frontend - Display

- **`src/app/(public)/feriados/page.tsx`** (lines 135-148) — Renders ALL holidays:
  ```tsx
  {feriados.map((feriado) => (  // No date filtering
  ```
  
- **`src/app/(public)/informacion/page.tsx`** (lines 180-190) — Preview shows up to 3:
  ```tsx
  {feriados.slice(0, 3).map((feriado) => (  // No date filtering
  ```

- **`src/components/admin/feriado-manager.tsx`** (lines 195-231) — Admin list:
  - Shows ALL holidays (expected for admin)
  - No date filtering needed here

### Utilities

- **`src/lib/dates.ts`** — Has `normalizeToDate()` but NO `getToday()` function

## Key Implementation Details

| Aspect | Value |
|--------|-------|
| Date format | `YYYY-MM-DD` string (NOT timestamp) |
| Today's reference | `normalizeToDate(new Date())` |
| Date comparison | String lexicographic (`"2026-03-25" > "2026-03-20"`) |
| State management | Zustand (but holidays are in local state via `useState`) |
| Validation | Zod v4 with refinements |

## Approaches

### 1. Zod Refinement (Backend Validation)

**Add past-date validation in `src/lib/schemas.ts`**

```typescript
// Add to createFeriadoSchema
.refine(
  (data) => {
    const today = normalizeToDate(new Date());
    return data.fecha >= today;
  },
  { message: "No se pueden crear feriados con fecha pasada" }
)
```

For `updateFeriadoSchema`, same refinement.

**Pros:**
- Single point of validation for both API and Server Actions
- Consistent error messages
- Zod v4 refinement pattern already used in codebase

**Cons:**
- Only blocks new creations/updates, doesn't prevent past holidays from existing in DB

**Effort:** Low — 2 refinements in schemas.ts

---

### 2. Date Utility Helper (Supporting)

**Add `getToday()` to `src/lib/dates.ts`:**

```typescript
export function getToday(): string {
  return normalizeToDate(new Date());
}
```

**Pros:**
- DRYs up `normalizeToDate(new Date())` calls
- Makes filtering logic clearer

**Cons:**
- None significant

**Effort:** Low — 3 lines

---

### 3. Frontend Filtering (UI Rule #2)

**Filter in public pages:**

In `src/app/(public)/feriados/page.tsx`:
```typescript
const today = getToday();
const upcomingFeriados = feriados.filter(f => f.fecha >= today);
```

In `src/app/(public)/informacion/page.tsx`:
```typescript
const today = getToday();
const upcomingFeriados = feriados.filter(f => f.fecha >= today).slice(0, 3);
```

**Pros:**
- Simple, localized change
- Admin still sees all holidays (correct behavior)
- No backend changes needed

**Cons:**
- Could also filter at API level for efficiency on large datasets

**Effort:** Low — 2 files, 2 lines each

---

### 4. Alternative: API-level Filtering

**Add query param to GET `/api/feriados?filter=future`**

**Pros:**
- More efficient for large datasets
- Single source of truth

**Cons:**
- More complex (new API endpoint/variant)
- Admin UI still needs all holidays

**Effort:** Medium

---

## Recommendation

**Use Approach 1 (Zod Refinement) + 2 (Date Helper) + 3 (Frontend Filter)**

Rationale:
- Zod validation blocks the problem at the entry point
- Date helper is a trivial improvement
- Frontend filtering is the simplest way to hide past holidays from users
- Admin UI should show ALL holidays (including past) so admins can manage them

**No DB changes needed** — the `fecha` field is already a string and comparisons work correctly.

## Implementation Order

1. Add `getToday()` to `src/lib/dates.ts`
2. Add Zod refinement for past dates in `src/lib/schemas.ts` (both create and update)
3. Add frontend filtering in `src/app/(public)/feriados/page.tsx`
4. Add frontend filtering in `src/app/(public)/informacion/page.tsx`

## Risks

- **Edge case**: What about holidays on "today"? Should they be visible? Likely YES — rule says "past dates" (< today), today should still show
- **Timezone**: The `normalizeToDate()` function already handles timezone correctly using local time
- **No rollback needed**: Just adds validation, doesn't change existing valid data

## Ready for Proposal

**Yes.** This is a straightforward feature with clear scope. Two distinct rules (block at creation, hide in UI), minimal files affected, no DB schema changes.
