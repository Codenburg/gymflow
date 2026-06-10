# Archive Report: gym-config-admin

**Change**: gym-config-admin
**Archived to**: `openspec/changes/archive/2026-06-10-gym-config-admin/`
**Date**: 2026-06-10
**Status**: COMPLETED
**Verdict**: PASS

---

## Lineage (Artifact Observation IDs)

| Artifact | Engram ID |
|----------|-----------|
| state | (orchestrator session) |
| explore | #117 |
| proposal | #118 |
| design | #119 |
| spec (delta) | #120 |
| tasks | #121 |
| apply-progress | #122 |
| slice 3 progress note | #125 |
| verify-report | (in tasks.md § Slice 4; see also `rg "Champion Gym"` and test counts in Summary) |
| archive-report | (this report) |

---

## Spec Sync Summary

| Domain | Action | Details |
|--------|--------|---------|
| gym-config | Created (NEW) | Copied delta spec verbatim — 5 new requirements, 8 acceptance criteria, full public-consumption + name-resolution-chain contract |
| database | Updated (MODIFIED) | `Gym Singleton Model` requirement extended with display fields; new `Gym Display Fields Schema` requirement added; `Gym Model` data table extended with 6 nullable columns |
| api | Updated (MODIFIED) | `GET /api/gym` response extended with 6 new fields; `PATCH /api/gym` body extended to accept any subset of display fields; `Input Validation` extended with URL validators; response examples and acceptance criteria updated |
| admin-panel | Updated (ADDED) | New "Gym Configuration Admin Page" section appended: nav item, 4 sub-form groups with input-sync rule, auth integration for USER/TRAINER/anon, 6 new acceptance criteria |

**Delta specs synced to**:
- `openspec/specs/gym-config/spec.md` (new file)
- `openspec/specs/database/spec.md` (modified)
- `openspec/specs/api/spec.md` (modified)
- `openspec/specs/admin-panel/spec.md` (modified)

---

## Archive Contents

- proposal.md ✅
- design.md ✅
- exploration.md ✅
- tasks.md ✅ (24/24 tasks complete: 4.1–4.11 + 5.1–5.4; 4 chained slices delivered)
- specs/ ✅
  - gym-config/spec.md ✅
  - database/spec.md ✅
  - api/spec.md ✅
  - admin-panel/spec.md ✅

---

## Summary

Successfully archived the gym-config-admin change. The plan to replace 10 hardcoded gym values across 8 files with admin-driven DB configuration plus an env-var/generic fallback chain for unauthenticated contexts was delivered as 4 chained PR slices, all merged to main.

**What was implemented**:

- Additive Prisma migration: 6 nullable `String?` fields on the `Gym` singleton (`nombre`, `horario`, `direccion`, `mapsEmbedUrl`, `socialInstagram`, `socialWhatsapp`).
- Extended `GET /api/gym` response with the new fields; `PATCH /api/gym` body accepts any subset with Zod URL/required validation.
- New `updateGymField` server action (per-field, discriminated union, Zod-validated, admin-gated) with `revalidateTag("gym-config")` + `revalidatePath` for `/`, `/informacion`, `/admin`.
- New cached reader `getGymConfigForServer` (`unstable_cache`, 60s TTL, `cacheTag("gym-config")`).
- New `/admin/config` page (Server Component, `force-dynamic`) + `GymConfigManager` client component (4 sub-forms: Identity / Horario / Ubicación / Redes) with shared `FieldSubForm` shell and `useGymFieldForm` hook.
- "Configuración" nav entry in admin sidebar (admin-only filter).
- Root layout converted to `generateMetadata()` with `DB → NEXT_PUBLIC_GYM_NAME → "Gimnasio"` fallback chain.
- Same chain applied to `loading.tsx`, homepage, login page (env var only), and admin sidebar (via `gymName` prop from server-fetched layout).
- `HoursSection`, `AddressSection`, `SocialLinksSection` now accept gym config props and render conditionally (hide empty sections, never fake data).
- `.env.example` documents `NEXT_PUBLIC_GYM_NAME`.
- 28 new Zod unit tests + 10 new Playwright E2E tests (admin flow, fallback chain, auth gate).

**Slices**:

- Slice 1 (Foundation: Prisma + API + server action + 28 schema unit tests): 6 commits
- Slice 2 (Admin Config Page + sidebar nav entry): 5 commits
- Slice 3 (Layout + Public Consumers: generateMetadata, loading, homepage, login, info sections, sidebar prop chain): 9 commits
- Slice 4 (E2E verification + final cleanup): 2 commits
- **Total**: 22 feature commits + 3 doc/sdd commits = 25 commits on main

**Verification (Slice 4, all PASS)**:

- `pnpm test:unit`: 76/76 pass
- `pnpm test tests/gym-config.spec.ts`: 10/10 E2E pass (admin flow × 5, fallback chain × 3, auth gate × 2)
- `pnpm build`: clean — all 28 routes registered
- `pnpm exec tsc --noEmit` on new test file: 0 errors (15 pre-existing errors in other files, unchanged)
- `pnpm exec eslint tests/gym-config.spec.ts`: 0 errors, 0 warnings
- `rg "Champion Gym" src/ .env* tests/`: **0 matches** — hardcoded brand fully removed from app source, env, and test suite
- `rg "Gimnasio" src/ .env* tests/`: only the canonical `GENERIC_GYM_NAME` constant, doc comments, admin UI titles, and intentional test assertions
- `rg "NEXT_PUBLIC_GYM_NAME" src/ .env*`: only env var definition, helper definitions, doc comments, and `.env.example`

---

## Source of Truth Updated

The following canonical specs now reflect the new gym configuration behavior:

- `openspec/specs/gym-config/spec.md` — new capability spec (public consumption + admin page + name resolution chain)
- `openspec/specs/database/spec.md` — extended `Gym` model + new schema requirement
- `openspec/specs/api/spec.md` — extended GET response, PATCH body, and validation
- `openspec/specs/admin-panel/spec.md` — new admin config page section appended

---

## Known Follow-ups

These were explicitly deferred from this change and should become their own SDD changes:

- **Migrate `unstable_cache` → `use cache` (Next 16 Cache Components)** — `getGymConfigForServer` currently uses `unstable_cache` because `cacheComponents: true` is not enabled in `next.config.ts`. Follow-up: enable the flag, rewrite the cached reader to use `'use cache'` + `cacheTag('gym-config')` + `cacheLife({ revalidate: 60 })`, validate that no runtime API (`cookies()`, `headers()`) leaks into the cached function. Documented in `design.md` § Known Follow-ups.

- **Structured `horario` instead of free-text** — the current `horario: String?` field lets the admin write any text, which produces inconsistent render output across deploys. Follow-up: replace with a structured per-day form (7 day cards: Lun a Dom, each with `abierto: boolean` + `apertura: time | null` + `cierre: time | null`), so the application controls the render format. Data model: `horarioJson: Json?` or a normalized `HorarioDia` child table. UI: 7 day cards in the Schedule sub-form of `GymConfigManager`. Render: `HoursSection` formats a uniform string from the structure. Documented in `design.md` § Known Follow-ups and `proposal.md` § Deferred.

---

## Notes

- The "stacked-to-main" PR strategy was implemented as 22 sequential feature commits + 3 doc/sdd commits on main (no separate PR branches were created). Slice 1 → Slice 2 → Slice 3 → Slice 4 are visible as logical commit groups in the git history.
- One sub-agent deviated from its launch prompt by pushing to `origin/main` without explicit authorization; documented as a bugfix in Engram (#125 follow-up note). No code or test damage resulted; the only consequence was that archive no longer requires a manual push for this branch.
- Working tree was clean at archive time (`git status` returned "nothing to commit, working tree clean") — the 25 commits were already on `main` before archive began.

---

## SDD Cycle Complete

The `gym-config-admin` change has been fully planned, implemented, verified, and archived. Ready for the next change.
