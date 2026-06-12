# Exploration: fix-pre-existing-ts-errors-remove-ignorebuilderrors

## Current State (TS Error Inventory)

`pnpm tsc --noEmit` reports **14 pre-existing TypeScript errors** distributed across 7 files. All are pre-existing (not introduced by recent changes). They are not blockers today because `next.config.ts` has `typescript.ignoreBuildErrors: true`, but the project cannot be called 1.0-ready with this safety net in place.

### Errors by location

| # | File | Line | Error Code | Error Message | Category |
|---|------|------|------------|---------------|----------|
| 1 | `src/components/admin/rutina-completa-form.tsx` | 403 | TS2353 | `'cancelText' does not exist in type 'ConfirmOptions'` | Real bug — `useConfirm` hook doesn't accept `cancelText` |
| 2 | `tests/check-db-accounts.ts` | 1 | TS2307 | `Cannot find module './generated/client'` (should be `'../generated/client'`) | **Wrong import path** — file is in `tests/`, client is at root |
| 3 | `tests/check-detail-page2.ts` | 1 | TS2393 | `Duplicate function implementation` | **Duplicate** — also defined in `check-full-body.ts` (both define `async function main()` at top-level) |
| 4 | `tests/check-full-body.ts` | 1 | TS2393 | `Duplicate function implementation` | Same as #3 |
| 5 | `tests/promocion-schemas.test.ts` | 211 | TS2339 | `Property 'precio' does not exist on type '{ id, titulo, descripcion? }'` | Discriminated union not narrowed |
| 6 | `tests/promocion-schemas.test.ts` | 223 | TS2339 | `Property 'titulo' does not exist on type '{ id, precio }'` | Same as #5 |
| 7 | `tests/promocion-schemas.test.ts` | 236 | TS2339 | `Property 'titulo' does not exist on type '{ id, activo }'` | Same as #5 |
| 8 | `tests/promocion-schemas.test.ts` | 237 | TS2339 | `Property 'precio' does not exist on type '{ id, activo }'` | Same as #5 |
| 9 | `tests/use-feriados-notification.test.ts` | 76 | TS2345 | `Argument of type 'null' is not assignable to parameter of type 'string'` | Test passing `null` to a function expecting `string` |
| 10 | `tests/use-feriados-notification.test.ts` | 86 | TS2345 | Same as #9 | Same as #9 |
| 11 | `tests/use-feriados-notification.test.ts` | 100 | TS2345 | Same as #9 | Same as #9 |
| 12 | `tests/use-feriados-notification.test.ts` | 119 | TS2345 | Same as #9 | Same as #9 |
| 13 | `tests/use-feriados-notification.test.ts` | 136 | TS2345 | Same as #9 | Same as #9 |
| 14 | `tests/verify-password.ts` | 1 | TS2307 | `Cannot find module './generated/client'` (should be `'../generated/client'`) | Same as #2 |

### Categorization

**Group A: Real bug (1 error)** — `cancelText` doesn't exist on the `useConfirm` hook's `ConfirmOptions`. Either the `useConfirm` hook should accept `cancelText`, or this code is dead (the field is being passed but ignored).

**Group B: Wrong import paths (2 errors, 2 files)** — `tests/check-db-accounts.ts` and `tests/verify-password.ts` import from `./generated/client` (treating the file as if it's at the project root). The `generated/client` directory is at the project root, so the import should be `'../generated/client'`. These are debug scripts.

**Group C: Duplicate function implementation (2 errors, 2 files)** — `tests/check-detail-page2.ts` and `tests/check-full-body.ts` both define `async function main()` at top-level. When TypeScript checks multiple files in a single program, top-level functions are in the global scope → conflict. These are debug scripts (not actual tests).

**Group D: Discriminated union not narrowed (4 errors, 1 file)** — `tests/promocion-schemas.test.ts` has 4 cases where TypeScript can't narrow the discriminated union type. Likely the test data needs a discriminator field added.

**Group E: Passing `null` to `string` parameter (5 errors, 1 file)** — `tests/use-feriados-notification.test.ts` has 5 cases passing `null` to a function expecting `string`. Either the function signature should accept `null`, or the tests should pass empty string `''` instead.

## Affected Files

### Files to FIX (the actual errors)
- `src/components/admin/rutina-completa-form.tsx` — fix `cancelText` (Group A)
- `tests/check-db-accounts.ts` — fix import path (Group B)
- `tests/check-detail-page2.ts` — fix duplicate main (Group C, option 1: wrap in a module)
- `tests/check-full-body.ts` — fix duplicate main (Group C, option 1: wrap in a module)
- `tests/verify-password.ts` — fix import path (Group B)
- `tests/promocion-schemas.test.ts` — fix 4 discriminated union errors (Group D)
- `tests/use-feriados-notification.test.ts` — fix 5 null-vs-string errors (Group E)

### Config to UPDATE
- `next.config.ts` — remove `typescript.ignoreBuildErrors: true` once all errors are fixed

## File-by-File Fix Strategy

### `src/components/admin/rutina-completa-form.tsx:403` (Group A)
- **Read** the `useConfirm` hook signature at `src/hooks/use-confirm.tsx` to see what it accepts
- **Option A**: Remove the `cancelText` field (if it was added mistakenly)
- **Option B**: Add `cancelText` to `ConfirmOptions` if the feature is intended

### `tests/check-db-accounts.ts` + `tests/verify-password.ts` (Group B)
- Change `import { PrismaClient } from './generated/client'` to `import { PrismaClient } from '../generated/client'`
- These are debug scripts (not test files), so they may not be in the regular test runner. But they ARE in the TS check.

### `tests/check-detail-page2.ts` + `tests/check-full-body.ts` (Group C)
- Both define `async function main()` at top-level → duplicate
- **Option A (recommended)**: Wrap each in an IIFE: `;(async () => { /* old body */ })()`
- **Option B**: Rename one of them (e.g., `mainDetail` vs `mainFullBody`)
- **Option C**: Delete one (they're debug scripts, may not be needed)
- **Option D**: Add `export {}` at the bottom to make each file a module (so `main` is scoped)

### `tests/promocion-schemas.test.ts` (Group D — 4 errors)
- The tests use a discriminated union (e.g., `PromocionContent` vs `PromocionPrecio` vs `PromocionActivo` from the Zod schema)
- Each variant of the union has different fields. The tests need to use a type guard or `z.infer` properly to narrow.
- **Fix approach**: Add a discriminator to the test data (e.g., `tipo: 'titulo' | 'precio' | 'activo'`) OR use `as` casting with a comment

### `tests/use-feriados-notification.test.ts` (Group E — 5 errors)
- A function expects `string` but tests pass `null`
- **Fix approach**: Change the function signature to accept `string | null` (most likely the actual fix — `use-feriados-notification` probably queries a DB row that may not exist), OR change the tests to pass `''` instead

## Affected Files Summary

| Group | Files affected | Errors |
|-------|----------------|--------|
| A (real bug) | 1 (`src/`) | 1 |
| B (wrong path) | 2 (`tests/`) | 2 |
| C (duplicate) | 2 (`tests/`) | 2 |
| D (discriminated union) | 1 (`tests/`) | 4 |
| E (null-vs-string) | 1 (`tests/`) | 5 |
| **Total** | **7 files** | **14 errors** |

## Risk: `ignoreBuildErrors` removal

Once all 14 errors are fixed, the final step is removing `typescript.ignoreBuildErrors: true` from `next.config.ts`. After this, the build WILL fail if any new TS error is introduced. This is the desired 1.0 behavior, but it does change the project's safety net.

Mitigation: keep `ignoreBuildErrors` removed as the LAST step (Slice 3) so any error introduced during the fixes can be caught immediately.

## Ready for Proposal

Yes. The inventory is complete, the fixes are mechanical, and the slice ordering (fix errors first, remove `ignoreBuildErrors` last) is the only safe order.
