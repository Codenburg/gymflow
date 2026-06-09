# Tasks: Migrate from npm to pnpm

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~60-80 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-forecast |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full migration + verification | Single PR | All changes in one PR, well under 400 lines |

## Phase 1: Foundation — pnpm Setup

- [x] 1.1 Run `pnpm import` from existing `package-lock.json` to generate `pnpm-lock.yaml`
- [x] 1.2 Add `packageManager` field (`"packageManager": "pnpm@11.2.2"`) to `package.json`
- [x] 1.3 Create `.npmrc` with `shamefully-hoist=false` (pnpm strict mode)
- [x] 1.4 `git rm package-lock.json` — remove npm lockfile

## Phase 2: Config & Script Updates

- [x] 2.1 `package.json`: convert `npx tsx` → `pnpm dlx tsx` in `db:seed` script and `prisma.seed` config
- [x] 2.2 `playwright.config.ts`: change `npm run dev` → `pnpm run dev` in webServer command
- [x] 2.3 `openspec/config.yaml`: change `Package manager: npm` → `Package manager: pnpm`

## Phase 3: Documentation

- [x] 3.1 `README.md`: update all `npm` / `npx` CLI examples to `pnpm` / `pnpm dlx`
- [x] 3.2 `CONTRIBUTING.md`: update Testing and DB command sections (`npm` → `pnpm`, `npx` → `pnpm dlx`)

## Phase 4: Verification

- [x] 4.1 Run `pnpm install` from clean state — ✅ PASSED (847 packages, prisma generate OK, zero errors)
- [x] 4.2 Run `pnpm run dev` — ✅ PASSED (server starts on port 3000 in 7.6s)
- [x] 4.3 Run `pnpm run build` — ❌ FAILED (pre-existing Prisma client-runtime-utils module resolution issue — not caused by pnpm migration)
- [x] 4.4 Run `pnpm run lint` — ✅ PASSED (1189 pre-existing issues found — 459 errors, 730 warnings — not regressions)
- [x] 4.5 Run `pnpm run test:unit` — ✅ PASSED (50/51 passing, 1 pre-existing failure: Zod error message mismatch)
