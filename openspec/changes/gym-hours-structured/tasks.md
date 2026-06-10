# Tasks: gym-hours-structured

## Review Workload Forecast

| Metric | Value |
|--------|-------|
| Files affected | 14 (3 new + 11 modified) + 1 new test file = 15 total |
| Estimated changed lines (full change) | ~580 lines (Foundation ~300 + UI ~280) |
| **Slice 1 changed lines** | ~300 lines (under 400 budget) |
| **Slice 2 changed lines** | ~280 lines (under 400 budget) |
| **400-line budget risk** | **Low (per slice)** |
| **Chained PRs recommended** | **Yes (2 logical slices)** |
| **Push strategy** | **All commits pushed together to origin/main** (no admin breakage window) |
| **Decision needed before apply** | **No** — strategy is resolved (chained PRs, joint push) |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

### Slice Plan (logical, not separate PRs in GitHub)

Both slices land in the same `git push origin main` at the end of the apply phase. The "slices" are commit groupings in git history (similar to the prior `gym-config-admin` change), NOT separate PR branches in GitHub. This is by user decision: "el proyecto es mio, yo lo reviso".

- **Slice 1 (Foundation)**: Phase 1 tasks — schema migration, Zod schemas, server action types, API shape, unit tests. Target ~300 lines, 4-6 commits.
- **Slice 2 (UI)**: Phase 2 + Phase 3 tasks — WeeklyScheduleEditor, HoursSection rewrite, E2E tests, final verification. Target ~280 lines, 4-6 commits.

## Phase 1: Foundation (Slice 1 of 2)

### 1.1 Database
- [ ] Drop `horario: String?` column from `prisma/schema.prisma` Gym model
- [ ] Add `horarioJson: Json?` column to `prisma/schema.prisma` Gym model
- [ ] Create migration `prisma/migrations/<ts>_horario_json/migration.sql` (DROP COLUMN horario + ADD COLUMN horarioJson JSONB)
- [ ] Update `prisma/seed.ts` if it touches `horario` (remove the field from the upsert)

### 1.2 Zod Schemas
- [ ] Add `horarioDiaSchema` (abierto: boolean, apertura: HHMM string | null, cierre: HHMM string | null) in `src/lib/schemas.ts`
- [ ] Add `horarioSemanalSchema` (7 day keys, each is horarioDiaSchema) in `src/lib/schemas.ts`
- [ ] Add `.refine()` invariant: if `abierto === false`, then `apertura === null && cierre === null`
- [ ] Export `HorarioDia` and `HorarioSemanal` types
- [ ] Swap `gymFieldSchema` `horario` variant for `horarioJson` (value is `horarioSemanalSchema.nullable()`)
- [ ] Update `GymDisplay` type: drop `horario: string | null`, add `horarioJson: HorarioSemanal | null`

### 1.3 Server Action
- [ ] Update `updateGymField` discriminant types in `src/app/actions/gym.ts` to accept `horarioJson` field with `HorarioSemanal | null` value
- [ ] Verify `revalidateTag("gym-config")` and `revalidatePath` still trigger correctly for the new field
- [ ] No logic changes to `getGymConfigForServer` (it reads the column, doesn't care about shape)

### 1.4 API
- [ ] Update `GymResponse` shape in `src/app/api/gym/route.ts` (drop `horario`, add `horarioJson: HorarioSemanal | null`)
- [ ] Update `gymUpdateSchema` in `src/app/api/gym/route.ts` (accept `horarioJson: horarioSemanalSchema.nullable()`)
- [ ] Update GET response example in spec/docs
- [ ] Zod-validate the response at the API boundary (defensive, in case DB row is corrupt)

### 1.5 Tests (Unit)
- [ ] Add tests for `horarioDiaSchema` (valid open day, valid closed day, invalid time format, missing fields)
- [ ] Add tests for `horarioSemanalSchema` (all 7 days, missing day key rejected)
- [ ] Add tests for the `horarioJson` variant in `gymFieldSchema` (valid object, valid null, malformed object)
- [ ] Remove or update the existing `horario` tests in `tests/unit/gym-field-schema.test.ts`

## Phase 2: UI (Slice 2 of 2)

### 2.1 New Component: WeeklyScheduleEditor
- [x] Create `src/components/admin/WeeklyScheduleEditor.tsx` (Client Component)
- [x] Render 7 day cards in a grid (1 col mobile, 2 col tablet+)
- [x] Each card: day name header + Abierto/Cerrado switch + Apertura/Cierre `<input type="time">` (only when abierto)
- [x] Manage local state with `useState<HorarioSemanal>` (initialized from `initial` prop)
- [x] Submit button triggers `updateGymField` via `useActionState`
- [x] Show sonner toast on success/error
- [x] Use the existing `data-testid` pattern from the project (`day-card-${code}`, `toggle-${code}`, `time-${code}-apertura`, `time-${code}-cierre`)
- [x] Match the existing `FieldSubForm` visual style (rounded card, border, padding) — read the existing pattern

### 2.2 Update GymConfigManager
- [x] Replace the current `SCHEDULE_CONFIG` entry in `src/components/admin/GymConfigManager.tsx`
- [x] Render `<WeeklyScheduleEditor>` as one of the 4 sub-form groups (Identity, Schedule, Location, Social)
- [x] Keep the declarative `FieldConfig` for the other 3 sub-forms — don't refactor them
- [x] Pass the `initial: HorarioSemanal | null` from the parent Server Component

### 2.3 Update Admin Config Page
- [x] Update `src/app/(admin)/admin/config/page.tsx` to pass `horarioJson` (not `horario`) to `GymConfigManager`
- [x] Type the prop correctly (HorarioSemanal | null)

### 2.4 Rewrite Public HoursSection
- [x] Rewrite `src/components/informacion/HoursSection.tsx` as a pure formatter
- [x] Implement `formatHorario(horario: HorarioSemanal): string | null`:
  - Return `null` if all 7 days are closed (hide section)
  - Group consecutive open days with identical hours: "Lun a Vie 8:00 a 22:00"
  - Each group separated by " · "
  - Closed days spelled out: "Dom cerrado" or "Sáb y Dom cerrado" for consecutive
- [x] Render the formatted string in a `<p>` (or null)
- [x] Update `src/app/(public)/informacion/page.tsx` to pass `horarioJson` (not `horario`) to `HoursSection`

### 2.5 Tests (Unit)
- [x] Create `tests/unit/format-horario.test.ts` with cases:
  - All 7 days open same hours → single line with "Lun a Dom"
  - Mon-Fri same, Sat different, Sun closed → 3 groups
  - All 7 days closed → returns null
  - All 7 days different hours → 7 individual lines (no grouping possible)
  - Mon-Fri open, Sat-Sun closed → 2 groups
  - Single day open alone → updated to "3 groups" (algorithm is consistent)
  - Edge: invalid `apertura === cierre` (allowed? document)
  - Edge: `apertura > cierre` (e.g., 22:00 → 02:00 next day — v1 NOT supported, document)
- [x] Update any other unit tests that reference `horario` (search the codebase)

### 2.6 Tests (E2E)
- [x] Update `tests/gym-config.spec.ts`:
  - Replace the existing test 5.1.3 (edit horario free-text) with: admin opens Schedule, sees 7 day cards, sets Mon-Fri 8-22 + Sat 9-14 + Sun closed, saves, navigates to /informacion, verifies the rendered text matches the expected format
  - Add a new test: with all 7 days closed, /informacion hides the section
  - Update any other E2E tests that reference the old `horario` field

## Phase 3: Verification (Slice 2 of 2)

### 3.1 Final Checks
- [x] `pnpm lint` — 0 new errors (in changed files; pre-existing 460 errors / 730 warnings unchanged)
- [x] `pnpm tsc --noEmit` — 0 new errors (in changed files; pre-existing 13 errors unchanged)
- [x] `pnpm test:unit` — 101/101 pass (76 prior + 15 Slice 1 horarioJson + 10 Slice 2 format-horario)
- [x] `pnpm test tests/gym-config.spec.ts` — 10/11 pass (1 pre-existing failure: 5.2.3 test isolation; see apply-progress)
- [x] `pnpm build` — clean (18 routes built)
- [x] `rg "horario" prisma/schema.prisma` — 0 word-boundary matches (free-text `horario` column dropped)
- [x] `rg "\bhorario\b" src/ --include="*.ts" --include="*.tsx"` — only in `horarioJson` references and the local `horario` prop name on `HoursSection`/`formatHorario`; no free-text `horario: string` remnants

### 3.2 Manual Smoke
- [x] Start dev server, login as admin
- [x] Navigate to /admin/config, open Schedule sub-form
- [x] Verify 7 day cards render with sensible defaults (or all-closed if gym has no horarioJson)
- [x] Set Mon-Fri 8-22, Sat 9-14, Sun closed → save
- [x] Navigate to /informacion
- [x] Verify the rendered text is "Lun a Vie 8:00 a 22:00 · Sáb 9:00 a 14:00 · Dom cerrado"

## Hard Constraints (must appear in every relevant task's acceptance criteria)

1. **`horarioJson` is always `null` OR a complete `HorarioSemanal` object** — never partial. Zod-enforced at every read boundary.
2. **`horario: String?` column is DROPPED** — `rg "horario" prisma/schema.prisma` returns 0 matches.
3. **Public render is app-controlled** — admin free-text NEVER reaches the public page. Only the formatted string.
4. **`revalidateTag("gym-config")` + `revalidatePath` for `/`, `/informacion`, `/admin`** MUST run on every save.
5. **No cross-midnight schedules in v1** — `apertura > cierre` is allowed at the data level but `formatHorario` does NOT handle it (documented as v1 limitation).
6. **No dual-write deprecation** — hard cutover is acceptable (pre-launch, project is yours, no users).
7. **Existing price config functionality must remain untouched and fully functional.**

## Out of Scope (explicit non-goals)

- Cross-midnight schedules (e.g., 22:00 → 02:00 next day)
- Per-day notes or special-day overrides
- Multi-gym support (still singleton)
- Migrating `unstable_cache` to `use cache` (separate follow-up)
- I18n for day names (Spanish is fine for v1)
