## Exploration: gym-hours-structured

### Current State

The `Gym` singleton (`prisma/schema.prisma:176-193`) currently stores a free-text `horario String?` column. The admin manages it via a single `<textarea>` in `GymConfigManager` (the `SCHEDULE_CONFIG` block, `src/components/admin/GymConfigManager.tsx:100-110`), which posts a `field="horario"` + `value=<text>` form to the `updateGymField` server action. Zod validates it as a trimmed string, 1–200 chars, in the `horario` literal member of the `gymFieldSchema` discriminated union (`src/lib/schemas.ts:398-405`). The public side (`src/components/informacion/HoursSection.tsx:14-24`) renders the raw string inside a `<p>` with `whitespace-pre-line`.

The data model chosen for this change is `horarioJson: Json?` (NOT a normalized `HorarioDia` table). Rationale (per orchestrator): single-tenant project, no cross-gym queries, the per-day shape is owned by the application layer.

Key observations from reading the code:

1. **No `Json` columns exist anywhere** in the current `prisma/schema.prisma`. This is the first Prisma `Json?` column in the project. The Postgres provider supports `Json` natively.
2. **No existing JSON validation pattern**. The closest analogue is `Feriado.hora_inicio`/`hora_fin` stored as `String?` (HH:MM) — the project prefers `String?` over `Json?` for time-like data.
3. **Time inputs already exist** in `src/components/admin/feriado-manager.tsx:181-196` (controlled `useState` + `<input type="time">`). Dark-mode CSS overrides for `input[type="time"]` are already in `src/app/globals.css:490-496`. We can reuse the visual pattern but the form shape is different (per-day grid, not a single create-row).
4. **The `updateGymField` discriminated union is open to extension**: adding a new `{ field: z.literal("horarioJson"); value: <scheduleShape> }` variant is a clean addition. The current `horario` literal member is a single string; changing it to a structured payload requires reshaping that one variant — the other 5 variants (nombre, direccion, mapsEmbedUrl, social*) are untouched.
5. **Two write paths feed the same column**: the per-field server action (`updateGymField`) AND the bulk REST PATCH (`PATCH /api/gym`). Both must agree on the new contract.
6. **The `GymDisplay` interface (`src/lib/schemas.ts:443-450`) is the contract** for the cached reader `getGymConfigForServer` and the admin page (`src/app/(admin)/admin/config/page.tsx:43-52`). It currently exposes `horario: string | null`. We need to add `horarioJson: HorarioSemanal | null` and decide whether to keep `horario` for deprecation.
7. **The `HoursSection` consumer (`src/app/(public)/informacion/page.tsx:192`)** is the only public reader. The page only needs a single prop change; the section's rendering logic is the actual rework (free-text → 7 day cards).
8. **Tests touch `horario` in two places**:
   - `tests/unit/gym-field-schema.test.ts:32, 88-91` — schema unit tests. Will need replacement with structured payload tests.
   - `tests/gym-config.spec.ts:50, 191-244` — E2E test 5.1.3 fills the textarea with a multi-line string and asserts the public page renders it as text. Needs full replacement: click per-day toggles, set times, assert the public page renders 7 day cards.

### Affected Areas

| Area | Impact | Why |
|------|--------|-----|
| `prisma/schema.prisma` | Modified | Drop `horario String?`, add `horarioJson Json?` (no @db type — Prisma maps `Json` to `jsonb` in Postgres by default). |
| `prisma/migrations/<ts>_horario_json/migration.sql` | New | `ALTER TABLE "Gym" DROP COLUMN "horario"; ADD COLUMN "horarioJson" JSONB;`. |
| `src/lib/schemas.ts` | Modified | Add `HorarioDia` + `HorarioSemanal` Zod schemas. Replace the `horario` literal member in `gymFieldSchema` with a `horarioJson` variant. Extend `GymDisplay` interface. |
| `src/app/actions/gym.ts` | Modified | `updateGymField` keeps its shape (per-field action) — the discriminant just changes to `horarioJson` and the value is the full weekly object. `getGymConfigForServer` needs no change. |
| `src/app/api/gym/route.ts` | Modified | `GymResponse` interface and `gymUpdateSchema` need to replace `horario` with `horarioJson`. GET response includes the new field. PATCH validates the structured shape. |
| `src/app/(admin)/admin/config/page.tsx` | Modified | `initial.horario` becomes `initial.horarioJson` (and the prop name on `GymConfigManager`). |
| `src/components/admin/GymConfigManager.tsx` | Rewritten | The `SCHEDULE_CONFIG` block's `<textarea>` is replaced by a `<WeeklyScheduleEditor>` client component (7 day cards, each with switch + 2 time inputs). `SCHEDULE_CONFIG` is removed or reduced to a section header. |
| `src/components/admin/WeeklyScheduleEditor.tsx` | New | Client component: 7 day cards, controlled state via `useActionState` returning the full weekly object, validation feedback. |
| `src/app/(public)/informacion/page.tsx` | Modified | `getGymDisplay()` returns `horarioJson` instead of `horario`. Pass it to `HoursSection`. |
| `src/components/informacion/HoursSection.tsx` | Rewritten | Accept `horario: HorarioSemanal | null` instead of `string | null`. Render 7 day cards (or a single compact grid) with the app's chosen render format. |
| `tests/unit/gym-field-schema.test.ts` | Modified | Replace `horario` test cases with `horarioJson` test cases (valid full week, partial week with all-dias-cerrados, malformed payload rejected). |
| `tests/gym-config.spec.ts` | Modified | Test 5.1.3: replace textarea fill with per-day interaction (toggle each day, set times), update public-page assertion to look for day-card structure. |
| `openspec/specs/database/spec.md` | Modified | Update Gym model table: `horario` → `horarioJson Json?`. |
| `openspec/specs/gym-config/spec.md` | Modified | Scenarios for "Public page reads hours" + "Admin opens config page" must describe structured data. |
| `openspec/specs/api/spec.md` | Modified | GET response shape + PATCH schema: `horario` → `horarioJson` JSON object. |
| `openspec/specs/admin-panel/spec.md` | Modified | Schedule sub-form is now a 7-day grid editor, not a textarea. |
| `openspec/CHANGELOG.md` | Modified | Note the `horario` → `horarioJson` migration. |
| `openspec/PRD.md` | Reviewed | No change expected (PRD is product-level; this is implementation detail). |

### Approaches

#### 1. **Prisma `Json?` column with full replacement** (recommended)
- Add `horarioJson Json?` (Prisma maps to `jsonb` in Postgres). Drop `horario String?` in the same migration. One `gymFieldSchema` variant now sends/validates the full weekly object.

**Pros:**
- Cleanest contract: one source of truth (`horarioJson`), no dual-write concerns.
- Free-text format is incompatible with structured data anyway — no useful deprecation window.
- App owns the render format. Admin UI just emits the canonical shape.
- Test surface is smaller (one type contract, not two).

**Cons:**
- Hard cutover. Any admin who set `horario` before this change loses that text on the next migration unless we add a one-shot data migration that parses common free-text formats (regex guess).
- First `Json` column in the project — small unknown around Prisma's typing ergonomics for nested `Json` (Prisma types it as `Prisma.JsonValue` which is permissive; we should narrow with Zod at the boundary).
- Cannot query "is Monday open?" via SQL — every read is full-document. Acceptable for singleton, single-tenant.

**Effort:** Medium. Schema migration is trivial. Main cost is the new weekly editor component + test rewrites.

#### 2. **Keep `horario` for legacy + add `horarioJson`, with dual-write deprecation period**
- `updateGymField` writes both. Public reader prefers `horarioJson` when present, falls back to `horario`. `horario` is "deprecated" but kept for one release.

**Pros:**
- Lower risk of losing admin's existing text.
- API consumers (if any) keep working.

**Cons:**
- Dual-source-of-truth forever. Public reader has to know which to prefer.
- The free-text format is not useful as a fallback — if the admin never re-saves in the new format, the public side renders the raw text, which is exactly the UX problem this change is solving.
- Two write paths must agree; both server action and REST PATCH.
- `horario` is internal — no external API consumers in this codebase.

**Effort:** High. Two fields, dual-write logic, dual-read logic, deprecation docs, eventual removal migration.

#### 3. **Normalized `HorarioDia` table** (one row per day, FK to Gym)
- `model HorarioDia { id, gymId, diaSemana: enum, abierto: bool, apertura: time?, cierre: time? }`.

**Pros:**
- Queryable per day, can be reused for future features (e.g., "is the gym open right now?").
- Time columns (`time` in Postgres) match the format.

**Cons:**
- Overkill for a singleton, single-tenant project. 7 rows vs 1 JSON document.
- A second model + Zod schemas + a new migration + a new server action for bulk upsert.
- Reintroduces the per-gym query path the project has deliberately avoided.

**Effort:** High. Wrong scope for this problem.

#### 4. **Array of 7 objects in a `Json?` column** (variant of #1)
- `horarioJson: HorarioSemanal | null` where `HorarioSemanal = HorarioDia[]` with exactly 7 elements in fixed order (lun→dom).

**Pros:**
- Stable iteration order, no need for a "day key" in the JSON.

**Cons:**
- Risk of admins reordering via drag-drop (not in scope but tempting). Array position semantics are fragile.
- App still has to know the order. A keyed object is just as clear.

**Effort:** Same as #1. Slightly different shape.

### Recommendation

**Approach #1: `Json?` column with full replacement, ordered array of 7 day objects** — the cleanest cutover that solves the actual problem (app-controlled render format, no free-text constraint) without carrying dead weight.

Shape:

```typescript
// In src/lib/schemas.ts
export const horarioDiaSchema = z.object({
  abierto: z.boolean(),
  apertura: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullish(),  // HH:MM 24h, optional
  cierre: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullish(),
});

export const horarioSemanalSchema = z.object({
  // Keys are localized day codes; values are the day config.
  lun: horarioDiaSchema,
  mar: horarioDiaSchema,
  mie: horarioDiaSchema,
  jue: horarioDiaSchema,
  vie: horarioDiaSchema,
  sab: horarioDiaSchema,
  dom: horarioDiaSchema,
});

export type HorarioDia = z.infer<typeof horarioDiaSchema>;
export type HorarioSemanal = z.infer<typeof horarioSemanalSchema>;
```

`gymFieldSchema` swaps the `horario` member for a `horarioJson` member with `value: horarioSemanalSchema` (allowing `null` for "all closed / unconfigured").

The UI renders 7 day cards. For each day, the admin toggles `abierto`. When `abierto = true`, two time inputs (`apertura`, `cierre`) become enabled; when `false`, the times are cleared to `null`. The form submits the entire `horarioJson` object in one action call.

**Hard cutover (no dual-write):** the existing free-text `horario` was a placeholder. The new format is incompatible. The `horarioJson: null` state covers the "admin hasn't configured this yet" case (HoursSection renders nothing — same as today's null state). We do NOT attempt to parse existing free-text values into structured form (the regex would be brittle and the data is throwaway).

### Risks

1. **First `Json` column in the project.** Prisma's generated type for `Json?` is `Prisma.JsonValue` which is `string | number | boolean | null | JsonObject | JsonArray` — not type-safe at the column level. Mitigation: narrow with `horarioSemanalSchema.parse()` at every DB-read boundary (cache reader, API GET, API PATCH response). Treat the DB column as `unknown`; trust Zod, not Prisma types.
2. **Test rewrites** for `tests/gym-config.spec.ts` 5.1.3 are non-trivial: the per-day interaction (14 inputs + 7 toggles per save) needs a robust Playwright selector strategy. Recommend `data-testid="day-card-${code}"` + `data-testid="toggle-${code}"` + `data-testid="time-${code}-apertura"` to keep selectors stable.
3. **No rollback path once deployed** (column dropped). Acceptable because: (a) `horario` was free-text with no downstream consumers, (b) the `horarioJson: null` state preserves the "render nothing" UX identical to today's null state, (c) admins re-save in 30 seconds.
4. **Time format ambiguity.** `<input type="time">` returns "HH:MM" 24h in Chromium/WebKit. We store as `string` (not `Date`) to match the existing `Feriado.hora_inicio`/`hora_fin` pattern. Document this in the Zod schema's regex.
5. **Cross-midnight schedule** (e.g., abierto 22:00 → 02:00 next day) is NOT supported in v1. The `cierre` time is interpreted as same-day. Document as a known limitation; add a follow-up story if the gym needs it.
6. **Chained PR risk**: estimated delta is ~600 lines (schema migration, new editor component, rewritten consumer, two test files, four OpenSpec specs). At the default 400-line review budget, this exceeds by ~50%. Consider chained PRs:
   - PR1: schema + Zod + reader (foundation, no UI)
   - PR2: admin editor + HoursSection rewrite (UI + tests)
   - The orchestrator should confirm `delivery_strategy` before `sdd-tasks` runs.
7. **Public page render control**: the user's stated intent is "the application controls the render format, not the admin's free text." This is fully achieved with a structured payload. Confirm with the user that the new admin form (which IS still controlled by the admin) is acceptable — i.e., the admin sets structured per-day times, the app chooses layout (cards, grid, table). The exploration assumes YES; flag this as a confirmation point in the proposal.

### Ready for Proposal

**Yes.** The shape is clear: `horarioJson: HorarioSemanal | null` (object with 7 keyed day entries, each `{ abierto, apertura, cierre }`), hard cutover from `horario String?`, Zod-narrowed at every read boundary, single-write per-field action. Affected files enumerated above. The only open question for the proposal is the chained-PR delivery strategy (estimated ~600 lines delta — at the 400-line budget this warrants discussion).

### Open Questions for the User (via Orchestrator)

1. **Chained PRs?** Estimated delta is ~600 lines (schema + editor + consumer + 2 test files + 4 OpenSpec specs). At the 400-line review budget, this exceeds by ~50%. Recommend chaining: PR1 = foundation (schema/Zod/reader), PR2 = UI/tests. Confirm or override.
2. **Render layout preference for the new `HoursSection`** — cards (one per day, vertical) vs grid (2-column) vs compact table. The new admin form sets structured data; the app picks the layout. Need a single direction to write the spec.
3. **Data migration of existing `horario` text?** Currently it stores free-text like "Lun-Vie 7:00-22:00" (or NULL). Recommended: hard drop, no parse attempt. Confirm.
