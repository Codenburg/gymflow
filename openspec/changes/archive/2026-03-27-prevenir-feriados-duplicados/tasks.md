# Tasks: Prevenir Feriados Duplicados

## Overview

Implement system-wide uniqueness constraint on `(gymId, fecha)` for the Feriado model, preventing duplicate holidays per gym. Includes migration cleanup, date normalization, 409 Conflict handling, and consistent error messaging.

---

## Phase 1: Database Migration (Foundation)

### 1.1 - Create Idempotent Duplicate Cleanup Migration Script

- [x] 1.1.1 Create `prisma/migrations/003_cleanup_feriado_duplicates/migration.sql`
- [x] 1.1.2 Script must detect duplicates: `SELECT gymId, fecha, COUNT(*) FROM Feriado GROUP BY gymId, fecha HAVING COUNT(*) > 1`
- [x] 1.1.3 Script keeps oldest record by `createdAt ASC`, deletes all others
- [x] 1.1.4 Script is idempotent: safe to run multiple times with same result
- [x] 1.1.5 Script normalizes dates to midnight before applying constraint
- [x] 1.1.6 Run script against database BEFORE applying unique constraint migration

### 1.2 - Add Unique Constraint to Prisma Schema

- [x] 1.2.1 Modify `prisma/schema.prisma` - Feriado model: add `@@unique([gymId, fecha])`
- [ ] 1.2.2 Run `npx prisma migrate dev --name add_feriado_gymid_fecha_unique`
- [ ] 1.2.3 Verify migration applies successfully
- [ ] 1.2.4 Verify no duplicates exist after migration: `SELECT gymId, fecha, COUNT(*) FROM Feriado GROUP BY gymId, fecha HAVING COUNT(*) > 1` returns 0 rows

---

## Phase 2: Date Normalization Utility (Infrastructure)

### 2.1 - Create `normalizeToDate` Utility

- [x] 2.1.1 Create `src/lib/dates.ts`
- [x] 2.1.2 Implement `normalizeToDate(input: string | Date): string` function
- [x] 2.1.3 Function must return `YYYY-MM-DD` format (ISO 8601 date-only)
- [x] 2.1.4 Handle `string` input: parse and extract date portion
- [x] 2.1.5 Handle `Date` input: use `toISOString().split('T')[0]`
- [x] 2.1.6 Use UTC to avoid timezone issues
- [x] 2.1.7 Add JSDoc documentation with @param, @returns, @example
- [x] 2.1.8 Export function as named export

---

## Phase 3: Schema Updates (Core Implementation)

### 3.1 - Update Zod Schemas for Feriado

- [x] 3.1.1 Modify `src/lib/schemas.ts`
- [x] 3.1.2 Add `statusCode?: number` field to `FormState` interface
- [x] 3.1.3 Add `code?: string` field to `FormState` interface (for error codes like "DUPLICATE")
- [x] 3.1.4 Rename `feriadoSchema` to `createFeriadoSchema` (or create as new)
- [x] 3.1.5 Update `createFeriadoSchema` to use `normalizeToDate()` on fecha field
- [x] 3.1.6 Create `updateFeriadoSchema` as partial of `createFeriadoSchema`
- [x] 3.1.7 `updateFeriadoSchema.fecha` must also normalize using `normalizeToDate()`
- [x] 3.1.8 Export both schemas with correct names

---

## Phase 4: Server Actions (Core Implementation)

### 4.1 - Update `createFeriado` Server Action

- [x] 4.1.1 Modify `src/app/actions/feriados.ts`
- [x] 4.1.2 Import `normalizeToDate` from `@/lib/dates`
- [x] 4.1.3 Apply `normalizeToDate()` to fecha BEFORE validation OR after validation before DB write
- [x] 4.1.4 Add pre-check duplicate validation:
  ```typescript
  const existing = await prisma.feriado.findFirst({
    where: { gymId: parsed.data.gymId ?? "gym", fecha: normalizedFecha }
  });
  if (existing) {
    return { success: false, message: "Ya existe un feriados para esta fecha", statusCode: 409, code: "DUPLICATE" };
  }
  ```
- [x] 4.1.5 Add P2002 catch block for race condition:
  ```typescript
  if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
    return { success: false, message: "Ya existe un feriados para esta fecha", statusCode: 409, code: "DUPLICATE" };
  }
  ```
- [x] 4.1.6 Normalize fecha when creating: `new Date(normalizedFecha)`

### 4.2 - Add `updateFeriado` Server Action

- [x] 4.2.1 Add new `updateFeriado` function to `src/app/actions/feriados.ts`
- [x] 4.2.2 SAME logic as `createFeriado`: normalize → pre-check → P2002 handling
- [x] 4.2.3 Use `updateFeriadoSchema` for validation
- [x] 4.2.4 Must check for duplicates EXCLUDING current record (for the same gymId):
  ```typescript
  const existing = await prisma.feriado.findFirst({
    where: {
      gymId: parsed.data.gymId ?? "gym",
      fecha: normalizedFecha,
      NOT: { id: idToUpdate }
    }
  });
  ```
- [x] 4.2.5 Return same 409 response structure as `createFeriado`
- [x] 4.2.6 Add `updateFeriado` to module exports

---

## Phase 5: API Routes (Core Implementation)

### 5.1 - Update `POST /api/feriados` for P2002 Handling

- [x] 5.1.1 Modify `src/app/api/feriados/route.ts`
- [x] 5.1.2 Import `normalizeToDate` from `@/lib/dates`
- [x] 5.1.3 Apply `normalizeToDate()` to fecha before Prisma create
- [x] 5.1.4 Add P2002 detection in catch block:
  ```typescript
  if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
    return NextResponse.json(
      { error: "Ya existe un feriados para esta fecha", code: "DUPLICATE" },
      { status: 409 }
    );
  }
  ```
- [x] 5.1.5 Ensure consistent error message format between create and update

### 5.2 - Add `PATCH /api/feriados` for Updates

- [x] 5.2.1 Add new `PATCH` handler to `src/app/api/feriados/route.ts`
- [x] 5.2.2 Use `updateFeriadoSchema` for validation
- [x] 5.2.3 Apply same P2002 handling as POST
- [x] 5.2.4 Return 409 on duplicate constraint violation
- [x] 5.2.5 Return 404 if record not found
- [x] 5.2.6 Return appropriate success response with updated data

---

## Phase 6: Frontend Integration (UI/UX)

### 6.1 - Update `FeriadoManager` Component for 409 Handling

- [x] 6.1.1 Modify `src/components/admin/feriado-manager.tsx`
- [x] 6.1.2 In `handleAdd`, check `result.statusCode === 409`:
  ```typescript
  if (result.success && result.data?.id) {
    // existing success handling
    toast.success("Feriado agregado exitosamente");
  } else if (result.statusCode === 409) {
    toast.error("Ya existe un feriados para esta fecha");
  } else {
    toast.error(result.message || "Error al guardar");
  }
  ```
- [x] 6.1.3 Ensure generic error toast for non-409 errors
- [x] 6.1.4 Import `FormState` type if not already imported

---

## Phase 7: Verification (Testing)

### 7.1 - Verify Migration Success

- [ ] 7.1.1 Run duplicate cleanup migration script
- [ ] 7.1.2 Verify: `SELECT gymId, fecha, COUNT(*) FROM Feriado GROUP BY gymId, fecha HAVING COUNT(*) > 1` returns 0 rows
- [ ] 7.1.3 Apply unique constraint migration
- [ ] 7.1.4 Verify constraint exists: `\d "Feriado"` in psql shows unique index

### 7.2 - Test Duplicate Creation Returns 409

- [ ] 7.2.1 Create a Feriado via UI or API
- [ ] 7.2.2 Attempt to create another Feriado with same gymId and fecha
- [ ] 7.2.3 Verify response is HTTP 409 with body `{ "error": "Ya existe un feriados para esta fecha", "code": "DUPLICATE" }`
- [ ] 7.2.4 Verify toast message appears: "Ya existe un feriados para esta fecha"

### 7.3 - Test Duplicate Update Returns 409

- [ ] 7.3.1 Create a Feriado via UI or API
- [ ] 7.3.2 Create another Feriado with different date
- [ ] 7.3.3 Attempt to update second Feriado's fecha to first Feriado's fecha
- [ ] 7.3.4 Verify response is HTTP 409 with DUPLICATE error code

### 7.4 - Test Same Date Different Gym Allowed

- [ ] 7.4.1 Create Feriado for gym "gym" on date "2026-12-25"
- [ ] 7.4.2 Create Feriado for gym "other-gym" on date "2026-12-25"
- [ ] 7.4.3 Verify both succeed (no 409)

### 7.5 - Test Date Normalization

- [ ] 7.5.1 Submit Feriado with fecha "2026-12-25T14:30:00.000Z"
- [ ] 7.5.2 Verify stored fecha has time component stripped (00:00:00.000Z)
- [ ] 7.5.3 Submit Feriado with fecha "2026-12-25" (date only)
- [ ] 7.5.4 Verify stored fecha is same

---

## Phase 8: Cleanup

### 8.1 - Final Review

- [x] 8.1.1 Verify `normalizeToDate()` is used in ALL places touching fecha (create, update, API, actions)
- [x] 8.1.2 Verify FormState has `statusCode` and `code` fields
- [x] 8.1.3 Verify 409 responses have consistent error format
- [ ] 8.1.4 Run existing tests to ensure no regressions
- [ ] 8.1.5 Commit changes with conventional commit format

---

## File Change Summary

| File | Action | Changes |
|------|--------|---------|
| `prisma/migrations/003_cleanup_feriado_duplicates/migration.sql` | Create | Idempotent duplicate cleanup |
| `prisma/schema.prisma` | Modify | Add `@@unique([gymId, fecha])` |
| `src/lib/dates.ts` | Create | `normalizeToDate()` utility |
| `src/lib/schemas.ts` | Modify | Add `statusCode`, `code` to FormState; rename/update schemas |
| `src/app/actions/feriados.ts` | Modify | Add duplicate pre-check, P2002 handling, add `updateFeriado` |
| `src/app/api/feriados/route.ts` | Modify | P2002 → 409, add PATCH handler |
| `src/components/admin/feriado-manager.tsx` | Modify | 409-specific toast handling |

---

## Task Totals

| Phase | Tasks | Focus |
|-------|-------|-------|
| Phase 1 | 7 | Database Migration |
| Phase 2 | 8 | Date Normalization Utility |
| Phase 3 | 8 | Zod Schema Updates |
| Phase 4 | 10 | Server Actions |
| Phase 5 | 9 | API Routes |
| Phase 6 | 4 | Frontend Integration |
| Phase 7 | 10 | Verification |
| Phase 8 | 6 | Cleanup |
| **Total** | **62** | |
