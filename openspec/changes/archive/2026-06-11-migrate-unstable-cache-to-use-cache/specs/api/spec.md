# Delta for API

## MODIFIED Requirements

### Requirement: GET /api/gym Endpoint

The system MUST provide a read-only endpoint to retrieve the current gym configuration. The response MUST include the structured `horarioJson` (validated `HorarioSemanal` object or `null`) plus the display fields and existing `price`, `createdAt`, `updatedAt`.

The underlying read MUST be served from `getGymConfigForServer` in `src/app/actions/gym.ts`, implemented with the Next.js 16 `use cache` directive, `cacheTag("gym-config")`, and `cacheLife({ revalidate: 60 })`. The reader MUST NOT call `prisma.gym.findUnique` directly.
(Previously: Reader used the legacy `unstable_cache` API.)

#### Scenario: Fetch gym configuration successfully

- GIVEN A Gym record exists with id "gym"
- WHEN A GET request is made to /api/gym
- THEN The response MUST return HTTP 200 with the full Gym object including `horarioJson` (no `horario` field)

#### Scenario: Response served from use cache on repeat reads

- GIVEN a GET /api/gym was made within the last 60 seconds with no mutation
- WHEN a second GET /api/gym is made
- THEN the response MUST be served from cache (no DB round-trip)

### Requirement: PATCH /api/gym Endpoint

The system MUST provide an authenticated endpoint to update gym configuration. The endpoint MUST accept any subset of the display fields plus `horarioJson` plus `price`, validate via Zod, and reject invalid input with HTTP 400.

On success the action MUST call BOTH `revalidatePath` for every affected route AND `revalidateTag("gym-config")` to invalidate the cached reader. Both calls are MANDATORY — omitting `revalidateTag` is the bug class fixed by this change.
(Previously: Actions called `revalidatePath` only.)

#### Scenario: Update gym price successfully

- GIVEN An authenticated admin and Gym id "gym" with price 45000
- WHEN A PATCH /api/gym is made with `{ "price": 50000 }`
- THEN The response MUST return HTTP 200 AND the new price MUST be persisted
- AND the action MUST call `revalidateTag("gym-config")` in addition to `revalidatePath`

#### Scenario: Cache invalidation propagates to next GET

- GIVEN an admin updated the gym price via PATCH /api/gym and the action called `revalidateTag("gym-config")`
- WHEN a subsequent GET /api/gym request is made
- THEN the response MUST return the new price (NOT the cached stale value)

## ADDED Requirements

### Requirement: Server Action Cache Invalidation Contract

Every mutation server action in `src/app/actions/*.ts` that mutates a row read by a `use cache` reader MUST call BOTH `revalidatePath` AND `revalidateTag` for the relevant tag. This contract codifies the latent-bug fix from the v0.19.0 audit (5 action files with zero `revalidateTag` calls, 4 with partial coverage).

Stable tag conventions:

| Tag | Used by readers | Invalidated by |
|-----|-----------------|----------------|
| `gym-config` | `getGymConfigForServer`, `getGymDisplayForServer`, `getGymPrice` | `actions/gym.ts` |
| `rutinas` | `getRoutinesPaginated`, `getTrainerCounts`, `getRutinas`, `getCachedRutinaById`, `getStats` | `actions/rutinas.ts`, `actions/ejercicios.ts`, `actions/dias.ts`, `actions/reorder.ts` |
| `promociones` | `getPromociones*` | `actions/promociones.ts` |
| `descuentos-duracion` | `getDescuentos*` | `actions/descuentos-duracion.ts` |
| `feriados` | `getFeriados*` (incl. `getLatestFeriadoDatePublic`) | `actions/feriados.ts` |
| `users` | trainer-management readers | `actions/trainers.ts` |

#### Scenario: Every mutation calls revalidateTag for the relevant tag

- GIVEN a server action mutates a row read by a `use cache` reader
- WHEN the action completes successfully
- THEN the action MUST call `revalidateTag` for EVERY cache tag subscribed to by the affected reader
- AND MUST also call `revalidatePath` for every route that renders the data
- AND omitting `revalidateTag` is a regression of the audit fix

#### Scenario: Zero-coverage action files now invalidate cache

- GIVEN the 5 action files previously with 0 `revalidateTag` calls
- WHEN the migration is complete
- THEN EVERY exported mutation in those files MUST call `revalidateTag("rutinas")` (or `revalidateTag("users")` for trainers) in addition to `revalidatePath`

#### Scenario: Tag literals are stable and identical

- GIVEN a tag like `promociones` is declared in a reader's `cacheTag(...)` call
- WHEN the corresponding action calls `revalidateTag(...)`
- THEN the string literal MUST be byte-identical between reader and action
- AND the same tag MUST be used by public and admin readers (one invalidation clears both)
