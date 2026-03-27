# Proposal: Prevenir Feriados Duplicados

## Intent

**Problem**: Currently, the `Feriado` model has NO unique constraint on `(gymId, fecha)`. This allows creating duplicate holidays for the same gym on the same date. The system lacks proper validation at both database and API layers, and the frontend shows generic error messages instead of specific feedback for duplicate detection.

**Why**: Users can accidentally (or intentionally) create duplicate holidays, leading to data inconsistency, confusing UI (duplicate cards), and potential issues in business logic that assumes one holiday per day per gym.

## Scope

### In Scope
- Add unique constraint on `(gymId, fecha)` in Prisma schema
- Normalize all dates to `YYYY-MM-DD` format (strip time component) before storage
- Add `P2002` Prisma error handling in API routes to return HTTP 409 Conflict
- Add pre-check duplicate validation in server actions before attempting create
- Enhance `FormState` interface with `statusCode` field for proper error differentiation
- Update frontend toast messages to show specific 409 Conflict errors for duplicates

### Out of Scope
- Batch duplicate detection/cleanup of existing data
- Unique constraint on other fields
- Multi-gym holiday merge functionality
- Retroactive migration to normalize existing dates (future task)

## Approach

### 1. Schema Migration
Add a unique index on `(gymId, fecha)` in `prisma/schema.prisma`:
```prisma
@@unique([gymId, fecha])
```

Create a migration that normalizes dates to midnight before adding the constraint (to handle existing time-stamped entries).

### 2. Date Normalization
Create a utility function `normalizeToDate()` in `src/lib/dates.ts` that strips time component:
```typescript
export function normalizeToDate(date: Date): string {
  return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
}
```

Update `createFeriado` and `updateFeriado` in server actions to normalize before Prisma calls.

### 3. API Error Handling
In `src/app/api/feriados/route.ts`, add P2002 error detection:
```typescript
if (error.code === 'P2002') {
  return Response.json(
    { error: 'Ya existe un feriado para esta fecha', code: 'DUPLICATE' },
    { status: 409 }
  );
}
```

### 4. Server Action Pre-check
In `src/app/actions/feriados.ts`, add duplicate check before create:
```typescript
const existing = await prisma.feriado.findFirst({
  where: { gymId: data.gymId, fecha: normalizedDate }
});
if (existing) {
  return { success: false, error: 'Duplicate', statusCode: 409 };
}
```

### 5. FormState Enhancement
Update `FormState` to include `statusCode`:
```typescript
interface FormState {
  success: boolean;
  error?: string;
  code?: string;
  statusCode?: number; // NEW
  data?: Partial<Feriado>;
}
```

### 6. Frontend 409 Handling
In `feriado-manager.tsx`, update toast handling:
```typescript
if (response.status === 409) {
  toast.error('Ya existe un feriado para esta fecha');
} else {
  toast.error('Error al guardar');
}
```

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Add `@@unique([gymId, fecha])` constraint |
| `src/lib/dates.ts` | New | Utility function `normalizeToDate()` |
| `src/app/api/feriados/route.ts` | Modified | Handle P2002 → 409 Conflict |
| `src/app/actions/feriados.ts` | Modified | Pre-check duplicate + set statusCode |
| `src/components/feriado-manager.tsx` | Modified | Handle 409 in toast messages |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Migration fails if duplicates exist | Medium | Pre-migration script to find/delete duplicates before constraint |
| Breaking change to FormState interface | Low | Update all consumers of FormState in the change |
| Timezone handling edge cases | Medium | Use UTC consistently, strip timezone info at boundary |
| Race condition between pre-check and create | Low | Let DB constraint be the source of truth, pre-check is UX optimization |

## Rollback Plan

1. **Database**: Revert migration using `prisma migrate revert`
2. **Code**: Revert all 5 files to previous commit
3. **FormState**: Remove `statusCode` field (breaking change)

## Dependencies

- Prisma 7+ (for `@@unique` syntax)
- Existing `Feriado` model with `gymId` and `fecha` fields

## Success Criteria

- [ ] Migration applies successfully (no duplicates block it)
- [ ] Creating a holiday for same date+same gym returns 409 Conflict
- [ ] Date is stored normalized (no time component)
- [ ] Frontend shows "Ya existe un feriado para esta fecha" on duplicate
- [ ] FormState correctly passes statusCode from server action to client
- [ ] All existing tests pass (if any exist)
