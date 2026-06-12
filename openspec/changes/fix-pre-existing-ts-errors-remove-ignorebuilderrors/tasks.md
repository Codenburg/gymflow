# Tasks: fix-pre-existing-ts-errors-remove-ignorebuilderrors

## Phase 1: Source error (Slice 1 of 3)

### 1.1 Fix `cancelText` in `src/components/admin/rutina-completa-form.tsx`
- [ ] Read `src/hooks/use-confirm.tsx` to understand the current `ConfirmOptions` type
- [ ] Read the call site at `src/components/admin/rutina-completa-form.tsx:403` to understand the intent
- [ ] If `cancelText` is a mistake: remove the field from the call site
- [ ] If `cancelText` is intended: add `cancelText?: string` to the `ConfirmOptions` type in `src/hooks/use-confirm.tsx`
- [ ] Verify: `pnpm tsc --noEmit` reports 0 errors in `src/`

## Phase 2: Test errors (Slice 2 of 3)

### 2.1 Fix import paths (2 files, 2 errors)
- [x] `tests/check-db-accounts.ts:1` — change `'./generated/client'` to `'../generated/client'`
- [x] `tests/verify-password.ts:1` — same fix

### 2.2 Fix duplicate function (2 files, 2 errors)
- [x] `tests/check-detail-page2.ts` — wrap `async function main()` in an IIFE: `(async () => { /* body */ })();`
- [x] `tests/check-full-body.ts` — same fix

### 2.3 Fix discriminated union (1 file, 4 errors)
- [x] `tests/promocion-schemas.test.ts:211,223,236,237` — add type narrowing to each of the 4 test cases (likely using `'prop' in data` checks or explicit type assertions with comments)

### 2.4 Widen function signature (1 file, 5 errors)
- [x] `tests/use-feriados-notification.test.ts` — read the implementation file (likely `src/hooks/use-feriados-notification.tsx`) to see the current signature
- [x] Widen the function signature to accept `string | null` (or whatever the actual type needs)
- [x] Update the implementation to handle `null` properly (return null, default value, etc.)
- [x] Verify: 5 test cases now pass typecheck

### 2.5 Verify Slice 2
- [x] `pnpm tsc --noEmit` reports 0 errors
- [x] `pnpm test:unit` still 101/101 passes
- [x] `pnpm test tests/gym-config.spec.ts` still 10/11 passes (same pre-existing 5.2.3 env-var failure)
- [x] `pnpm build` still succeeds (with `ignoreBuildErrors: true` still in place)

## Phase 3: Remove safety net (Slice 3 of 3)

### 3.1 Remove `typescript.ignoreBuildErrors: true` from `next.config.ts`
- [ ] Modify `next.config.ts` — remove the `typescript: { ignoreBuildErrors: true }` block
- [ ] Add a comment explaining the rationale: "All TS errors fixed; build now catches new ones"

### 3.2 Verify Slice 3 (the critical verification)
- [ ] `pnpm tsc --noEmit` — 0 errors
- [ ] `pnpm build` — **MUST SUCCEED** (this is the critical verification — if it fails, the cycle is incomplete and the safety net needs to be re-added)
- [ ] `pnpm test:unit` — 101/101 passes
- [ ] `pnpm test tests/gym-config.spec.ts` — 10/11 passes
- [ ] `rg "ignoreBuildErrors" next.config.ts` — 0 matches
- [ ] Manual smoke: introduce a temporary `any` type in a test file, verify `pnpm build` now fails (the safety net is gone)

## Phase 4: Verification (final, post-Slice 3)

### 4.1 Final checks
- [ ] `pnpm lint` — 0 new errors (459 pre-existing in `tests/` are out of scope for this change; that's a separate follow-up)
- [ ] `pnpm tsc --noEmit` — 0 errors
- [ ] `pnpm build` — clean
- [ ] `pnpm test:unit` — 101/101 passes
- [ ] `pnpm test tests/gym-config.spec.ts` — 10/11 passes
- [ ] `rg "Champion Gym" src/` — 0 matches (inherited constraint)
- [ ] `rg "ignoreBuildErrors" next.config.ts` — 0 matches

## Review Workload Forecast

| Metric | Value |
|--------|-------|
| Files affected | 8 (1 src + 6 tests + 1 config) |
| Estimated changed lines (full change) | ~30-50 lines (most fixes are 1-2 line changes) |
| **Slice 1 changed lines** | ~5 lines (1 src file) |
| **Slice 2 changed lines** | ~30-40 lines (6 test files) |
| **Slice 3 changed lines** | ~5 lines (1 config file) |
| **400-line budget risk** | **Low** for all 3 slices |
| **Chained PRs recommended** | **Yes (3 logical slices)** |
| **Push strategy** | **All commits pushed together to origin/main** (joint push per user pattern) |
| **Decision needed before apply** | **No** — strategy is resolved |

### Slice Plan

- **Slice 1 (Source error)** — ~5 lines, 1 commit. Fix the 1 src/ error.
- **Slice 2 (Test errors)** — ~30-40 lines, 4-6 commits. Fix the 13 test errors (2-3 per file).
- **Slice 3 (Remove safety net)** — ~5 lines, 1 commit. Remove `ignoreBuildErrors`.

All 3 slices land in the same `git push origin main` at the end of the apply phase.

### Hard Constraints

1. **All 14 errors must be fixed** before Slice 3 (the build will fail otherwise)
2. **No new TypeScript errors introduced** — the build will catch them
3. **All existing tests still pass** — 101/101 unit + 10/11 E2E
4. **No behavior changes** — these are type-level fixes, not logic fixes (except possibly the `use-feriados-notification` signature widening, which is logic-adjacent)
5. **DO NOT push during apply** — leave all commits local, the user pushes manually after all 3 slices complete
6. **The `useConfirm` hook signature is the only one that might need to change** in `src/` (if Option A2 is chosen). Read the hook first to see if the signature already supports the new field.
7. **Do NOT add `any` casts** to make the errors go away — fix the actual issue
8. **Do NOT use `as` assertions** in test files unless absolutely necessary (prefer type narrowing via `in` operator or type guards)

### Out of Scope (explicit non-goals)

- Lint cleanup (459 errors, 730 warnings) — separate 1.0 prep item
- GGA pre-commit hook false positives — separate 1.0 prep item (GGA-FOLLOWUP-1)
- E2E coverage for critical flows — separate 1.0 prep item
- New test files (the fix is making existing tests type-safe, not adding new ones)
- Stricter TypeScript config (the project is already strict, no changes needed)
