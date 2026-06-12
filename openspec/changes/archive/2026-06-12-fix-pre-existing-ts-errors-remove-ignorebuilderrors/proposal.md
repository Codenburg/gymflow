# Proposal: Fix pre-existing TypeScript errors + remove `ignoreBuildErrors`

## Intent

The project ships with `typescript.ignoreBuildErrors: true` in `next.config.ts`, which hides 14 pre-existing TypeScript errors from `next build`. This is a 1.0 blocker — the project cannot be called production-ready while depending on a build safety net to hide type errors. This change fixes all 14 errors and removes the `ignoreBuildErrors` flag, so the build will catch any new TypeScript error from this point forward.

The 14 errors are spread across 7 files (1 in `src/`, 6 in `tests/`). Most are mechanical (wrong import paths, duplicate function names, discriminated union not narrowed). One is a real bug (`cancelText` passed to a `useConfirm` hook that doesn't accept it).

## Scope

### In Scope
- Fix 14 pre-existing TypeScript errors across 7 files
- Remove `typescript.ignoreBuildErrors: true` from `next.config.ts`
- Verify the build succeeds with the flag removed

### Out of Scope
- New TypeScript configuration (e.g., `strict: true` if not already on) — already configured, no changes needed
- Lint cleanup (separate follow-up: 459 errors / 730 warnings)
- GGA pre-commit hook false positives (separate follow-up: GGA-FOLLOWUP-1)
- New tests for the existing test files (the fix is making existing tests type-safe, not adding new tests)

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `admin-panel`: `rutina-completa-form.tsx` fix the `cancelText` issue (Group A)
- (Implicit) `testing`: 6 `tests/` files get type fixes; no new test behavior, just the type system can now verify the existing tests

## Approach

3 chained logical slices, joint push (per user pattern: "el proyecto es mio, yo lo reviso"):

- **Slice 1 (Source error)**: Fix the 1 error in `src/components/admin/rutina-completa-form.tsx` (the `cancelText` real bug). Safest first.
- **Slice 2 (Test errors)**: Fix the 13 errors in 6 test files. Mechanical changes (import paths, function naming, type narrowing, signature widening).
- **Slice 3 (Remove safety net)**: Remove `typescript.ignoreBuildErrors: true` from `next.config.ts`. Run `pnpm build` to confirm 14/14 errors are gone and the project builds clean.

Slice 3 is the most critical verification — if the build fails after removing `ignoreBuildErrors`, it means a previous slice missed an error and the cycle is incomplete.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/admin/rutina-completa-form.tsx` | Modified | Fix `cancelText` (either remove it or add to `ConfirmOptions` type) |
| `tests/check-db-accounts.ts` | Modified | Fix import path `'./generated/client'` → `'../generated/client'` |
| `tests/verify-password.ts` | Modified | Same import path fix |
| `tests/check-detail-page2.ts` | Modified | Resolve duplicate `main()` function (wrap in IIFE or rename) |
| `tests/check-full-body.ts` | Modified | Same |
| `tests/promocion-schemas.test.ts` | Modified | Add type narrowing to 4 test cases |
| `tests/use-feriados-notification.test.ts` | Modified | Change function signature to accept `string \| null` (or fix tests to pass `''`) |
| `next.config.ts` | Modified | Remove `typescript.ignoreBuildErrors: true` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Fixing the `cancelText` issue may require a `useConfirm` hook signature change (breaking other callers) | Low | Read the hook first; if the feature is needed, add `cancelText?` (optional) to the type. If dead code, just remove the field. |
| Resolving the duplicate `main()` may break the debug scripts' runtime behavior | Low | The fix is IIFE wrapping or renaming — semantically identical |
| Changing the `use-feriados-notification` test signature may affect other callers | Low | Read the implementation first; if `null` is a real possibility, change the type to `string \| null` and handle it |
| After removing `ignoreBuildErrors`, the build will fail if any other latent error exists | Low | Run `pnpm tsc --noEmit` before Slice 3 to verify 0 errors |

## Rollback Plan

3-step rollback in reverse slice order (Slice 3 → Slice 2 → Slice 1):
- Slice 3: re-add `typescript.ignoreBuildErrors: true` to `next.config.ts`
- Slice 2: revert the 13 test file fixes
- Slice 1: revert the `cancelText` fix in `rutina-completa-form.tsx`

If the rollback needs to happen quickly (e.g., a critical error in production), Slice 3 alone is sufficient to restore the safety net.

## Dependencies

- `next@16.1.6` — already installed
- Existing `useConfirm` hook in `src/hooks/use-confirm.tsx`
- Existing `use-feriados-notification` implementation

## Performance & Breaking Changes

- **Bundle size**: Negligible — no new code
- **Performance**: No change
- **Breaking changes**:
  - `next.config.ts` loses `typescript.ignoreBuildErrors: true` — any new TS error WILL fail the build. This is a desired behavior change for 1.0.
  - `useConfirm` may gain a new optional `cancelText?` field (no breaking change if optional)
  - `use-feriados-notification` may accept `string | null` (no breaking change if was previously rejecting `null` at runtime)

## Success Criteria

- [ ] `pnpm tsc --noEmit` reports 0 errors
- [ ] `pnpm test:unit` still 101/101 passes (no behavior change)
- [ ] `pnpm build` succeeds with `typescript.ignoreBuildErrors: true` removed
- [ ] No new commits introduce TS errors (build will catch them)
- [ ] All 14 errors catalogued above are resolved

## Bump Type

- Recommended: **0.20.0** (MINOR pre-1.0)
- Rationale: removes a build safety net, which is a meaningful change. 1.0 prep item.

## Note for the future agent

After this change, the project's build is strict: any new TypeScript error will fail `next build`. The remaining 1.0 prep items are #3 (E2E coverage) and #4 (GGA pre-commit hook diff-only). The user explicitly chose 0.19.0 for the cache migration (the "MAJOR in pre-1.0" change), so 0.20.0 is consistent.
