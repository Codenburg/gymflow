# Verification Report: prevenir-feriados-duplicados

**Change**: prevenir-feriados-duplicados
**Version**: spec.md N/A (delta spec for holidays duplicates prevention)

---

## Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 62 |
| Tasks complete | 57 |
| Tasks incomplete | 5 |

### Incomplete Tasks (Critical)

1. **1.2.2** - Run `npx prisma migrate dev --name add_feriado_gymid_fecha_unique` - Migration NOT applied
2. **1.2.3** - Verify migration applies successfully - Not done
3. **1.2.4** - Verify no duplicates exist after migration - Not done
4. **7.1.1-7.1.4** - Phase 7 verification tasks - Not done

### Incomplete Tasks (Cleanup/Verification)

5. **8.1.4** - Run existing tests to ensure no regressions - Test infrastructure has issues
6. **8.1.5** - Commit changes - Not done

---

## Build & Tests Execution

**Build**: ⚠️ TypeScript errors in test files only (non-blocking for production)

```
tests/check-db-accounts.ts(1,30): error TS2307: Cannot find module './generated/client'
tests/check-detail-page2.ts(1,16): error TS2393: Duplicate function implementation.
tests/feriados-badge-api.spec.ts: errors in test infrastructure
tests/use-feriados-notification.test.ts: errors in test infrastructure
```

The source code compiles without errors. Test file issues are pre-existing.

**Tests**: ⚠️ Test infrastructure has Vitest/Playwright configuration issues
- Test runner fails to start due to module import issues
- Cannot execute tests to verify behavior

**Coverage**: ➖ Not configured

---

## Spec Compliance Matrix

| Requirement | Scenario | Implementation | Result |
|-------------|----------|----------------|--------|
| Unique Constraint | Create first holiday | `@@unique([gymId, fecha])` in schema | ✅ COMPLIANT (schema only) |
| Unique Constraint | Create duplicate holiday | DB constraint + pre-check + P2002 handling | ⚠️ PARTIAL (migration not applied) |
| Unique Constraint | Same date different gym | DB constraint allows (composite key) | ⚠️ PARTIAL (migration not applied) |
| Unique Constraint | Race condition | DB constraint is authoritative | ⚠️ PARTIAL (migration not applied) |
| Date Normalization | Date with time normalized | Server actions use `normalizeToDate()` | ✅ COMPLIANT |
| Date Normalization | Date-only unchanged | `normalizeToDate()` handles both | ✅ COMPLIANT |
| Date Normalization | Different times blocked | Normalization strips time | ✅ COMPLIANT |
| API Returns 409 | P2002 Prisma error | POST/PATCH catch P2002 → 409 | ✅ COMPLIANT |
| API Returns 409 | Generic error | Returns 500 with error message | ✅ COMPLIANT |
| DB Constraint | Pre-check passes but constraint fails | P2002 catch block exists | ✅ COMPLIANT |
| Server Action Pre-check | Duplicate detected | Pre-check in createFeriado | ✅ COMPLIANT |
| Server Action Pre-check | Unique creation allowed | Proceeds to DB | ✅ COMPLIANT |
| FormState | Success has no statusCode | Optional field | ✅ COMPLIANT |
| FormState | Conflict has statusCode 409 | Returns with code "DUPLICATE" | ✅ COMPLIANT |
| Frontend Toast | Duplicate shows specific toast | `result.statusCode === 409` → specific message | ✅ COMPLIANT |
| Frontend Toast | Generic error shows generic toast | Falls through to generic | ✅ COMPLIANT |

**Compliance summary**: 12/16 scenarios fully compliant, 4/16 partially compliant due to migration not applied

---

## Correctness (Static — Structural Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| `@@unique([gymId, fecha])` constraint in schema | ✅ Implemented | Line 194 in schema.prisma |
| Migration applied | ❌ Missing | No migration found for unique constraint |
| `normalizeToDate()` exists | ✅ Implemented | `src/lib/dates.ts` with proper JSDoc |
| `normalizeToDate()` handles string | ✅ Implemented | Uses `new Date(input).toISOString().split('T')[0]` |
| `normalizeToDate()` handles Date | ✅ Implemented | Uses `input.toISOString().split('T')[0]` |
| `normalizeToDate()` uses UTC | ✅ Implemented | `toISOString()` is always UTC |
| Zod schema uses normalizeToDate | ⚠️ Partial | Uses `new Date()` instead, but server actions normalize |
| `FormState` has `statusCode?: number` | ✅ Implemented | Line 200 in schemas.ts |
| `FormState` has `code?: string` | ✅ Implemented | Line 201 in schemas.ts |
| createFeriado normalizes fecha | ✅ Implemented | Line 70: `normalizeToDate(parsed.data.fecha)` |
| createFeriado pre-check exists | ✅ Implemented | Lines 72-88 |
| createFeriado catches P2002 | ✅ Implemented | Lines 108-116 |
| createFeriado returns 409 DUPLICATE | ✅ Implemented | Lines 82-87 |
| updateFeriado normalizes fecha | ✅ Implemented | Lines 164-166 |
| updateFeriado pre-check excludes current | ✅ Implemented | Lines 170-186 |
| updateFeriado catches P2002 | ✅ Implemented | Lines 214-222 |
| updateFeriado returns 409 DUPLICATE | ✅ Implemented | Lines 180-185 |
| POST API catches P2002 | ✅ Implemented | Lines 139-145 |
| PATCH API catches P2002 | ✅ Implemented | Lines 266-272 |
| Error message format | ⚠️ Inconsistent | API says "feriados" (plural), spec says "feriado" (singular) |
| Frontend checks 409 | ✅ Implemented | Line 71: `result.statusCode === 409` |
| Frontend shows specific toast | ✅ Implemented | Line 73: "Ya existe un feriados para esta fecha" |

---

## Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| DB Constraint as source of truth | ✅ Yes | `@@unique([gymId, fecha])` in schema |
| Store as DateTime with normalization | ✅ Yes | Uses `normalizeToDate()` before DB write |
| FormState minimal change (optional fields) | ✅ Yes | Both fields are optional |
| Pre-check for UX only | ✅ Yes | P2002 catch also exists |
| normalizeToDate utility | ✅ Yes | Created as separate utility |
| API layer P2002 handling | ✅ Yes | Both POST and PATCH handle it |

**Deviations Found**:
1. **Zod schema transform** - Spec says schemas should use `normalizeToDate()` but they use `new Date()`. However, normalization happens at server action layer before DB write, so behavior is correct.
2. **Error message pluralization** - API returns "Ya existe un feriados para esta fecha" (plural) but spec says "Ya existe un feriado para esta fecha" (singular). Minor inconsistency.

---

## Issues Found

### CRITICAL (must fix before archive)

1. **Migration not applied** - The `@@unique([gymId, fecha])` constraint exists in schema.prisma (line 194) but NO migration has been created or applied to add this constraint to the database. The existing migration (20260314210758_add_feriado) only creates the table without the unique constraint.

2. **No verification of constraint** - Tasks 7.1.1-7.1.4 (Phase 7 verification) are incomplete. Cannot verify:
   - No duplicate holidays exist in DB
   - Migration applies successfully
   - Constraint exists in actual database

### WARNING (should fix)

3. **Zod schemas don't use normalizeToDate** - Tasks 3.1.5 and 3.1.7 specify that schemas should use `normalizeToDate()` on the fecha field, but `createFeriadoSchema` and `updateFeriadoSchema` use `new Date(data.fecha)` instead. The normalization IS happening at the server action layer (before DB write), so functionally it's correct, but the spec compliance is partial.

4. **Error message pluralization inconsistency** - The spec says "Ya existe un **feriado** para esta fecha" but the code returns "Ya existe un **feriados** para esta fecha". Note: spec.md line 27 says "feriados" (plural) in one place but "feriado" (singular) in others.

5. **Test infrastructure broken** - Cannot run tests to verify behavioral compliance due to Vitest/Playwright configuration issues.

### SUGGESTION (nice to have)

6. **Missing cleanup migration** - Task 1.1 mentions creating `prisma/migrations/003_cleanup_feriado_duplicates/migration.sql` but this folder doesn't exist.

---

## Verdict

**FAIL** - Cannot complete verification due to critical issues.

### Summary

The implementation is structurally complete and follows the design, but the migration to apply the unique constraint to the database has NOT been executed. The constraint exists in the Prisma schema file but has not been applied to the actual database. Without running the migration and verifying it succeeds, the duplicate prevention system is incomplete.

### Required Actions Before Archive

1. **Run migration**: `npx prisma migrate dev --name add_feriado_gymid_fecha_unique`
2. **Verify migration**: Confirm it applies without errors
3. **Verify no duplicates**: Run the duplicate check query
4. **Fix test infrastructure**: Resolve Vitest import issues to enable behavioral testing
5. **Address schema normalization**: Either update Zod schemas to use `normalizeToDate()` or document the deviation
