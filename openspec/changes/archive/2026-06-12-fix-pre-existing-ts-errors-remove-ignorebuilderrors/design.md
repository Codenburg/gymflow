# Design: Fix pre-existing TypeScript errors + remove `ignoreBuildErrors`

## Architecture

- **High-level**: Fix 14 pre-existing TS errors → remove `ignoreBuildErrors` → verify clean build
- **No new abstractions, no API changes** — pure hygiene + remove safety net

## File-by-File Fix Strategy (per category)

### Group A: Real bug — `cancelText` (1 file)

`src/components/admin/rutina-completa-form.tsx:403` passes `cancelText` to a `useConfirm` hook that doesn't accept it. The fix depends on what `useConfirm` supports:

```typescript
// src/hooks/use-confirm.tsx (read first to see current options)
interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  // ...
}
```

**Two options**:
- **A1 (preferred if `cancelText` was a mistake)**: Just remove the `cancelText: "..."` field from the call site. Most likely the case.
- **A2 (if the feature is intended)**: Add `cancelText?: string` to `ConfirmOptions` in the hook. The hook would need to wire it through to the dialog.

Default: A1. Verify with read first.

### Group B: Wrong import paths (2 files)

```typescript
// tests/check-db-accounts.ts:1
// BEFORE:
import { PrismaClient } from './generated/client';
// AFTER:
import { PrismaClient } from '../generated/client';
```

Same fix for `tests/verify-password.ts`. These are debug scripts; the fix is one character.

### Group C: Duplicate function (2 files)

`tests/check-detail-page2.ts` and `tests/check-full-body.ts` both define `async function main()` at top-level. TypeScript treats them as the same function in the global program scope → duplicate error.

**Fix**: Wrap each in an IIFE so `main` is scoped to the file:

```typescript
// BEFORE:
async function main() {
  // ... body
}
main();

// AFTER:
(async () => {
  // ... body (unchanged)
})();
```

Or add `export {}` at the bottom to make it a module (then `main` is scoped, but still need to invoke it). IIFE is cleaner.

### Group D: Discriminated union not narrowed (1 file, 4 cases)

`tests/promocion-schemas.test.ts` has 4 cases where TypeScript can't narrow the union type. The tests are likely doing something like:

```typescript
// BEFORE (TS error):
const data = zodSchema.parse(input); // returns the union type
expect(data.precio).toBe(100); // TS doesn't know which variant
```

**Fix**: Add explicit type narrowing OR use a discriminator. Two approaches:

```typescript
// Approach 1: Type narrowing via Zod's discriminated union
if ('precio' in data) {
  expect(data.precio).toBe(100);
}

// Approach 2: Use Zod's `.transform` or test the variant directly
const promoData = zodPromocion.parse(input);
expect(promoData).toEqual({ id: '...', precio: 100 });
```

### Group E: `null` vs `string` (1 file, 5 cases)

`tests/use-feriados-notification.test.ts` passes `null` to a function expecting `string`. This is most likely a real test case (testing what happens when a value is missing).

**Fix**: Widen the function signature to accept `string | null`:

```typescript
// BEFORE (TS error):
function someHook(value: string) { ... }
// Called with: someHook(null)

// AFTER:
function someHook(value: string | null) { ... }
// Now handles null internally with a null check
```

This requires reading the actual implementation in `src/hooks/use-feriados-notification.tsx` (or wherever) to see how to handle `null` properly.

## File-by-File Changes (per slice)

### Slice 1: Source error (1 file)
- `src/components/admin/rutina-completa-form.tsx` — remove `cancelText` field (or add to hook type)

### Slice 2: Test errors (6 files, 13 errors)
- `tests/check-db-accounts.ts` — fix import path (1 error)
- `tests/verify-password.ts` — fix import path (1 error)
- `tests/check-detail-page2.ts` — wrap `main()` in IIFE (1 error)
- `tests/check-full-body.ts` — wrap `main()` in IIFE (1 error)
- `tests/promocion-schemas.test.ts` — add type narrowing to 4 test cases (4 errors)
- `tests/use-feriados-notification.test.ts` — widen function signature to `string | null` (5 errors)

### Slice 3: Remove safety net (1 file)
- `next.config.ts` — remove `typescript.ignoreBuildErrors: true`
- Verify: `pnpm tsc --noEmit` reports 0 errors
- Verify: `pnpm build` succeeds

## Total Stats

- 8 files affected (1 in `src/`, 6 in `tests/`, 1 config)
- ~30-50 lines net change (most fixes are 1-2 line changes)
- 3 slices, each well under 400-line budget
- Bump: **0.20.0** pre-1.0

## Risk: what if a fix reveals a deeper issue?

Example: widening `use-feriados-notification`'s signature to accept `null` might require null-handling logic in the implementation, not just a signature change. Slice 2 should:
1. Read the implementation first
2. If null-handling is trivial (return null, default value), do it
3. If null-handling is complex, document and defer to a follow-up SDD change

Slice 2 is the most likely place to surface deeper issues. Each fix should be in its own commit so a complex fix can be reviewed independently.

## Caching & Revalidation Contract

No cache impact. This change is pure type fixes and config changes. The runtime behavior of the project is unchanged (or improved by removing type bypasses).

## Test Strategy

**Unit tests (Vitest)**: 101/101 should still pass (no behavior change).

**E2E tests (Playwright)**: 10/11 still pass (same pre-existing 5.2.3 env-var failure).

**Build verification**: `pnpm build` must succeed with `ignoreBuildErrors: true` removed. If it fails, the cycle is incomplete.

## Ready for Tasks

Yes. The fixes are mechanical, the slice ordering is safe, and the verification gate is clear.
