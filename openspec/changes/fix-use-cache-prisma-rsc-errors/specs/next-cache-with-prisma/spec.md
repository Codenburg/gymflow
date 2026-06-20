# Next Cache with Prisma Specification

## Purpose

Rule and regression coverage for combining Next.js cache APIs with the singleton `prisma`. The `"use cache"` directive serializes the captured closure; `prisma` is not JSON-serializable. Any cached reader importing `prisma` MUST use `unstable_cache` instead.

## Requirements

### Requirement: Prisma-Importing Readers MUST Use unstable_cache

Any cached reader in `src/` that imports `prisma` from `@/lib/prisma` MUST use `unstable_cache` from `next/cache` with unique `keyParts`, `tags`, and `revalidate` matching the data domain. The reader MUST NOT use `"use cache"` or `use cache: private`.
(Reason: `"use cache"` serialized the `prisma` closure and produced `PrismaClientKnownRequestError` for all 11 readers migrated in v0.19.0.)

#### Scenario: No Prisma-importing file uses use cache

- GIVEN the source tree under `src/`
- WHEN the guard runs: `grep -rl '"use cache"' src/ | xargs grep -l 'from "@/lib/prisma"'`
- THEN the command MUST return zero files
- AND no `src/lib/**` or `src/app/actions/**` reader that imports `prisma` MAY start with `"use cache"`

#### Scenario: All 11 migrated readers use unstable_cache

- GIVEN the 11 cached readers (`getGymNameForServer`, `getGymDisplayForServer`, `getGymPrice`, `getRutinas`, `getCachedRutinaById`, `getStats`, `getPromociones`, `getFeriados`, `getDescuentos`, `getRoutinesPaginated`, `getTrainerCounts`)
- WHEN each function source is inspected
- THEN each body MUST be wrapped in `unstable_cache(...)` from `next/cache`
- AND no body MUST start with `"use cache"`

#### Scenario: Reader has unique keyParts

- GIVEN two distinct readers live in the same module (e.g. `getGymNameForServer`, `getGymDisplayForServer`)
- WHEN their `unstable_cache` calls are inspected
- THEN each MUST declare a unique `keyParts` array to prevent cache-key collisions

### Requirement: Cache Tags and TTLs Are Preserved

| Domain | Tag | TTL |
|--------|-----|-----|
| gym-config (4) | `gym-config` | 60s |
| rutinas (3) | `rutinas` | 60s |
| rutinas-pagination (2) | `rutinas` | 30s |
| promociones / descuentos / feriados | matching | 60s (30s feriados) |

Mutation actions MUST call `revalidateTag(<tag>)` alongside any `revalidatePath` calls.

#### Scenario: gym-config tag revalidates all gym-config readers

- GIVEN `updateGymField` runs
- WHEN the action calls `revalidateTag("gym-config")`
- THEN all gym-config readers MUST be invalidated
- AND the next read MUST return the new gym row

#### Scenario: rutinas tag revalidates all rutinas readers

- GIVEN a rutina mutation runs and calls `revalidateTag("rutinas")`
- THEN all rutinas and rutinas-pagination readers MUST be invalidated
- AND the next read MUST return the new DB state

### Requirement: Vitest Grep Guard Against use cache

A Vitest unit test MUST scan every `.ts`/`.tsx` file under `src/` and FAIL if any file contains BOTH `"use cache"` AND `from "@/lib/prisma"`. The failure message MUST name the offending file.

#### Scenario: Guard fails on a Prisma + use cache combination

- GIVEN a developer adds `"use cache"` inside `src/lib/example.ts` that imports `from "@/lib/prisma"`
- WHEN `pnpm test:unit` runs
- THEN the grep-guard test SHALL fail and name the offending file

#### Scenario: Guard passes when no file matches both conditions

- GIVEN no file under `src/` contains both `"use cache"` and `from "@/lib/prisma"`
- WHEN `pnpm test:unit` runs
- THEN the grep-guard test SHALL pass

### Requirement: Playwright E2E Regression for Homepage Errors

A Playwright test SHALL navigate to `/` and assert the browser console is free of `PrismaClientKnownRequestError` and `Event handlers cannot be passed to Client Component props`. The test SHALL also visit the error path that renders `ErrorState` and assert the "Reintentar" button is clickable.

#### Scenario: Homepage loads with no Prisma or event-handler errors

- GIVEN the dev server runs on port 3000
- WHEN Playwright navigates to `/`
- THEN the response status SHALL be 200
- AND the browser console SHALL NOT contain `PrismaClientKnownRequestError` or `Event handlers cannot be passed to Client Component props`
- AND the `ErrorBoundary:homepage` boundary SHALL NOT trigger

#### Scenario: ErrorState reintentar button is clickable

- GIVEN an error path renders `ErrorState`
- WHEN Playwright locates `[data-testid="error-state"]`
- THEN the "Reintentar" button SHALL be visible and enabled
- AND clicking it SHALL trigger `window.location.reload()`