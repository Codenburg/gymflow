# Proposal: Feriados Past Date Rules

## Intent

Block creation/update of holidays with past dates (security + UX) AND hide past holidays from public UI without deletion. Two distinct rules that work together: validation at entry points prevents bad data, filtering in public views improves UX.

## Scope

### In Scope
- Add `getToday()` utility function (single definition, DRY)
- Add Zod refinement for past-date validation (UX layer — user-facing errors)
- Add explicit server action validation (security layer — blocks bypass attempts)
- Filter public holiday views (feriados page, informacion preview)
- Admin UI: date input min attribute + shows ALL holidays (no filter)

### Out of Scope
- Database schema changes (no new constraints)
- Automatic deletion of past holidays
- Cron jobs or scheduled tasks
- API-level filtering (frontend filtering sufficient)

## Approach

1. **Utility**: Create `getToday()` in `src/lib/dates.ts` — returns `YYYY-MM-DD` string using local time, no Date comparisons needed (string lexicographic works)
2. **Zod schemas**: Add `.refine()` to `createFeriadoSchema` and `updateFeriadoSchema` — blocks `fecha < hoy` with user-friendly error
3. **Server actions**: Add explicit `if (fecha < getToday()) throw Error()` check in `createFeriado` and `updateFeriado` — security layer
4. **Public views**: Filter with `feriados.filter(f => f.fecha >= getToday())` on `/feriados` and `/informacion` preview
5. **Admin UI**: Add `min={getToday()}` to date input (UX hint) but NO filtering on list — admin sees all

### Business Rules (Final)
| Context | Rule |
|---------|------|
| Create/Edit | `fecha >= hoy` allowed, `fecha < hoy` blocked |
| Public UI | `fecha >= hoy` visible, `fecha < hoy` hidden (no delete) |
| Admin | Sees ALL holidays (no filter) |
| Edge case `fecha === hoy` | Valid and visible |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/dates.ts` | Modified | Add `getToday()` function |
| `src/lib/schemas.ts` | Modified | Add Zod refinement for past date check |
| `src/app/actions/feriados.ts` | Modified | Add explicit validation in create/update actions |
| `src/app/(public)/feriados/page.tsx` | Modified | Filter: `feriados.filter(f => f.fecha >= getToday())` |
| `src/app/(public)/informacion/page.tsx` | Modified | Filter preview section |
| `src/components/admin/feriado-manager.tsx` | Modified | Add `min={getToday()}` to date input |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `fecha === hoy` edge case not handled | Low | Both Zod and server action use `>=` comparison |
| Timezone issues with date comparison | Low | `getToday()` uses local time consistently; string comparison works for same-format dates |
| Admin can't edit past holidays | Low | Admin has full access, no filtering on list |

## Rollback Plan

1. Remove `getToday()` from `dates.ts` (or keep if useful elsewhere)
2. Remove `.refine()` calls from both schemas
3. Remove explicit checks from server actions
4. Remove `.filter()` calls from public pages
5. Remove `min={getToday()}` from admin date input
6. No DB migration needed — existing past holidays remain but are now hidden in public views

## Dependencies

- None — pure additive changes

## Success Criteria

- [ ] Can create holiday with today's date (`fecha === hoy`) — succeeds
- [ ] Can create holiday with future date — succeeds
- [ ] Cannot create holiday with past date — Zod error shown, server action rejects
- [ ] Cannot update past holiday to stay in past — same validation blocks
- [ ] `/feriados` page shows only today+future holidays (admin sees all in manager)
- [ ] `/informacion` preview shows only today+future holidays
- [ ] TypeScript compiles without errors
- [ ] ESLint passes
- [ ] No breaking changes to existing functionality
