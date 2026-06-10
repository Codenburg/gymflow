# Design: Gym Hours Structured Form

## Technical Approach

Hard-cutover from a free-text `horario: String?` column to a structured `horarioJson: Json?` column on the existing `Gym` singleton. The shape is `HorarioSemanal` — a Zod-validated object with exactly 7 keyed entries (`lun`…`dom`), each `{ abierto: boolean, apertura: HH:MM | null, cierre: HH:MM | null }`. The admin form (WeeklyScheduleEditor) replaces the `<textarea>` with 7 day cards. The public `HoursSection` becomes a pure formatter (object → single-line string). One Zod variant in `gymFieldSchema` (`horarioJson` instead of `horario`) carries the full weekly payload in a single action call. Backend (Foundation) ships in PR1, UI in PR2 — chained to keep each under the 400-line review budget.

## Architecture Decisions

### Decision: Standalone `<WeeklyScheduleEditor>` (bypass the `FieldConfig` shell)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Make `WeeklyScheduleEditor` a special case in `GymConfigManager` (refactor `FieldConfig` to support composite fields) | Touches the working single-input abstraction; risk to 5 other sub-forms | **Reject** |
| Make `WeeklyScheduleEditor` standalone — it owns its `useActionState`, layout, and submit button. `GymConfigManager` renders it as a peer card. | Reuses the existing `AdminCard` + icon + toast pattern; `FieldConfig` stays untouched for the other 5 fields | **Chosen** |

**Rationale**: The current `FieldConfig` + `FieldSubForm` + `useGymFieldForm` trio is built for a single input → single value. A 7-day editor with 14 time inputs + 7 switches is qualitatively different. The proposal/Exploration § Recommend isolated this; design agrees.

### Decision: Hard cutover, no dual-write

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Hard cutover: drop `horario`, add `horarioJson`, `null = unconfigured` | One column, one validator, one source of truth; admin re-saves in 30s | **Chosen** |
| Dual-write for one release (`horario` + `horarioJson`, prefer new) | Two write paths, two read fallbacks, deprecation docs | **Reject** |

**Rationale**: Free-text is incompatible with structured data; a fallback that re-renders free text would re-introduce the very UX problem we're solving. Pre-launch, no external consumers.

### Decision: `Json?` (jsonb) over normalized `HorarioDia` table

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `horarioJson: Json?` — single document, Zod-narrowed at every read | Singleton, single-tenant, no per-day queries needed | **Chosen** |
| `model HorarioDia { gymId, diaSemana, abierto, apertura, cierre }` | Queryable per day, but adds a model + Zod schemas + new action + relations on a singleton | **Reject** |

**Rationale**: Singleton + no cross-gym queries. Cost of a second model > benefit. Zod is the type boundary (Prisma types `Json` as `Prisma.JsonValue` — narrow with `horarioSemanalSchema.parse()` at every read site).

### Decision: Chained PRs (Foundation → UI)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Single PR (~600 lines, `size:exception`) | Simpler review, but exceeds 400-line budget | **Reject** |
| Chained: PR1 Foundation (~300L, schema + Zod + API + tests, no UI) → PR2 UI (~280L, editor + render + tests) | Each PR under budget, autonomous scope, but Slice 1 leaves the admin form broken for the window between merges | **Chosen** |
| Hybrid: keep `horario` column hidden in PR1, drop in PR2 | Zero breakage window but doubles migration work | **Reject** |

**Rationale**: Slice 1 ships the same day as Slice 2 (chained, not stacked), so the admin form is broken for a few hours max. Acceptable; documented in the design.

## Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│  Admin opens /admin/config                                   │
└──────────────────────────────────────────────────────────────┘
              │  RSC: getGymConfigForServer() ◄── unstable_cache "gym-config"
              ▼
   <GymConfigManager initial={{ horarioJson: …, … }}>
              │
              ├──► <FieldSubForm config={…}>  ×5 (nombre, direccion, maps, ig, wa)
              │
              └──► <WeeklyScheduleEditor initial={horarioJson} onSave={…}>
                        │  7 day cards, useActionState(updateGymField, …)
                        │  FormData: { field: "horarioJson", value: JSON.stringify(obj) }
                        ▼
                updateGymField({ field: "horarioJson", value: obj })
                        │  verifyAdmin → gymFieldSchema.safeParse
                        │  prisma.gym.update({ horarioJson: obj })
                        │  revalidateTag("gym-config")
                        │  revalidatePath("/", "/informacion", "/admin")
                        ▼
                     Postgres (Gym.id="gym", horarioJson jsonb)
                        │
                        ▼  on next request
                  /informacion RSC
                  getGymConfigForServer() → gym.horarioJson
                  <HoursSection horario={horarioJson}> (pure formatter)
```

## Data Model

```prisma
model Gym {
  // ... existing fields ...
  horarioJson Json?  // structured weekly hours; null = unconfigured (section hidden)
}
```

Postgres type: `jsonb` (Prisma's `Json?` maps to `jsonb` by default on Postgres). Migration: `ALTER TABLE "Gym" DROP COLUMN "horario"; ALTER TABLE "Gym" ADD COLUMN "horarioJson" JSONB;`. **Nullable, not defaulted** — `null` = unconfigured (preserves the current "hide section" UX), defaulting would mask missing config and risk rendering stale data after deploy.

## Zod Schema Design

```ts
const HHMM = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;

export const horarioDiaSchema = z
  .object({
    abierto: z.boolean(),
    apertura: z.string().regex(HHMM).nullish(),
    cierre: z.string().regex(HHMM).nullish(),
  })
  .refine(
    (d) =>
      (!d.abierto && (d.apertura == null) && (d.cierre == null)) ||
      (d.abierto && d.apertura != null && d.cierre != null),
    { message: "Si el día está abierto, apertura y cierre son obligatorios" }
  );

export const horarioSemanalSchema = z.object({
  lun: horarioDiaSchema, mar: horarioDiaSchema, mie: horarioDiaSchema,
  jue: horarioDiaSchema, vie: horarioDiaSchema, sab: horarioDiaSchema,
  dom: horarioDiaSchema,
});
export type HorarioDia = z.infer<typeof horarioDiaSchema>;
export type HorarioSemanal = z.infer<typeof horarioSemanalSchema>;
```

Invariant: `abierto=false` ⇒ both times `null`; `abierto=true` ⇒ both times present. Enforced by `.refine()` (Zod 4). The `gymFieldSchema` swaps the `horario` variant for `{ field: z.literal("horarioJson"), value: horarioSemanalSchema.nullable() }`. The `value` is a parsed object (Prisma accepts JSON-serializable values for `Json?`); the form serializes once before `formData` submission. `GymDisplay` swaps `horario: string | null` for `horarioJson: HorarioSemanal | null`.

## Server Action / API Design

- `updateGymField` — no structural change. The `value` parameter type widens from `string` to `string | HorarioSemanal | null`. The `gymFieldSchema.safeParse({ field, value: formData.get("value") })` call dispatches per `field` literal. For `horarioJson`, `value` arrives as a JSON string from `FormData`; the action calls `horarioSemanalSchema.parse(JSON.parse(value))` OR (cleaner) the form submits via a hidden `value` populated with a stringified JSON. **Chosen**: the form pre-serializes the object to a string, `safeParse` validates the JSON, and the action stores the parsed object. This keeps the existing `formData.get("value")` pattern.
- `GET /api/gym` — `GymResponse` swaps `horario: string | null` for `horarioJson: HorarioSemanal | null`.
- `PATCH /api/gym` — `gymUpdateSchema` swaps the `horario` string member for `horarioJson: horarioSemanalSchema.nullable().optional()`.

## Component Design

### `<WeeklyScheduleEditor>` (new, Client)

Props: `initial: HorarioSemanal | null`, `onSuccess?: (value: HorarioSemanal | null) => void`. Renders an `AdminCard` with the Clock icon + "Horarios" header (matches the section look of the 5 sibling sub-forms) and a 2-col grid (1-col mobile) of 7 day cards. Each card has: day name header, `<Switch>` (Abierto/Cerrado), and when open: two `<input type="time">` for Apertura + Cierre. Uses `useActionState(updateGymField, …)` with a hidden `field="horarioJson"` and a hidden `value` that the form populates via a `useRef` + on-submit sync (or by reading from controlled state in `onSubmit` before `formAction`). On success: `toast.success("Horarios actualizados")` + `router.refresh()`. Data attributes for E2E: `data-testid="day-card-lun"`, `data-testid="toggle-lun"`, `data-testid="time-lun-apertura"`, etc.

### `HoursSection` (rewritten)

Pure formatter: `formatHorario(horario: HorarioSemanal): string | null`. Walks the 7 days in order, groups consecutive open days with identical `(apertura, cierre)` into `"Lun a Vie 8:00 a 22:00"`, joins groups with `" · "`. Closed days become the group `"Dom cerrado"`. If all 7 days are closed → `null` (section hidden). The component renders nothing if `horario` is `null` or `formatHorario` returns `null`.

Examples:
- All 7 open, same hours → `"Lun a Dom 8:00 a 22:00"`
- Lun-Vie 8–22, Sáb 9–14, Dom cerrado → `"Lun a Vie 8:00 a 22:00 · Sáb 9:00 a 14:00 · Dom cerrado"`
- Lun-Vie open, Sáb-Dom closed → `"Lun a Vie 8:00 a 22:00 · Sáb y Dom cerrado"`
- All 7 closed → `null`

## File Changes

| File | Action | Lines (est.) |
|------|--------|--------------|
| `prisma/schema.prisma` | Modify — drop `horario`, add `horarioJson Json?` | -1 / +1 |
| `prisma/migrations/<ts>_horario_json/migration.sql` | Create | 4 |
| `src/lib/schemas.ts` | Modify — add `horarioDiaSchema` + `horarioSemanalSchema`, swap `gymFieldSchema` variant, update `GymDisplay` + `GYM_FIELD_NAMES` | +50 / -15 |
| `src/app/actions/gym.ts` | Modify — type-widen the `value` parameter, parse JSON for `horarioJson` variant | +10 / -2 |
| `src/app/api/gym/route.ts` | Modify — `GymResponse` + `gymUpdateSchema` swap | +15 / -15 |
| `src/app/(admin)/admin/config/page.tsx` | Modify — `horario` → `horarioJson` in `initial` | -1 / +1 |
| `src/components/admin/GymConfigManager.tsx` | Modify — drop `SCHEDULE_CONFIG`, render `<WeeklyScheduleEditor>` | -10 / +12 |
| `src/components/admin/WeeklyScheduleEditor.tsx` | Create | +180 |
| `src/app/(public)/informacion/page.tsx` | Modify — pass `horarioJson` to `HoursSection` | -1 / +1 |
| `src/components/informacion/HoursSection.tsx` | Rewrite — pure formatter + new prop | -25 / +40 |
| `src/components/informacion/format-horario.ts` | Create — extracted pure formatter (unit-testable) | +50 |
| `tests/unit/gym-field-schema.test.ts` | Modify — replace `horario` cases with `horarioJson` cases | +60 / -25 |
| `tests/unit/format-horario.test.ts` | Create — pure function tests | +90 |
| `tests/gym-config.spec.ts` | Modify — replace E2E 5.1.3 with per-day interaction + add all-closed render test | +80 / -50 |

**Total: ~+475 / -110 (PR1: ~300, PR2: ~280).**

## Interfaces / Contracts

```ts
// src/lib/schemas.ts
export const horarioDiaSchema: z.ZodType<HorarioDia>;
export const horarioSemanalSchema: z.ZodType<HorarioSemanal>;
export type HorarioDia = { abierto: boolean; apertura: string | null; cierre: string | null };
export type HorarioSemanal = { lun: HorarioDia; mar: HorarioDia; mie: HorarioDia;
                                jue: HorarioDia; vie: HorarioDia; sab: HorarioDia; dom: HorarioDia };
export interface GymDisplay { nombre: string | null; horarioJson: HorarioSemanal | null;
                              direccion: string | null; mapsEmbedUrl: string | null;
                              socialInstagram: string | null; socialWhatsapp: string | null; }

// src/components/informacion/format-horario.ts
export function formatHorario(h: HorarioSemanal): string | null;
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| **Unit** | `horarioDiaSchema`: valid open (with times), valid closed (null times), rejects open without times, rejects closed with times, rejects malformed HH:MM | Vitest `safeParse` cases |
| **Unit** | `horarioSemanalSchema`: all 7 days valid, rejects missing day | Vitest |
| **Unit** | `formatHorario`: 6+ cases covering each format-rule example + single-day-closed + all-7-different hours + all closed | Vitest, pure function |
| **Unit** | `gymFieldSchema` `horarioJson` variant: accepts valid object, accepts `null`, rejects malformed | Vitest |
| **E2E** | Replace 5.1.3: admin opens Schedule sub-form → 7 day cards visible → set Mon-Fri 8–22, Sat 9–14, Sun closed → save → `/informacion` renders "Lun a Vie 8:00 a 22:00 · Sáb 9:00 a 14:00 · Dom cerrado" | Playwright, `data-testid` selectors |
| **E2E** | All-7-closed render test: admin saves all closed → `/informacion` hides the hours section | Playwright |
| **E2E** | Existing 5.1.1, 5.1.2, 5.1.4, 5.1.5, 5.2.x, 5.3.x must still pass | Playwright regression |

## Migration / Rollout

Two chained PRs, merged in order the same day:

**Slice 1 (Foundation)** — schema + Zod + API + action types + unit tests. No UI changes. **The Schedule sub-form is temporarily broken**: the textarea submits `value="<text>"`, which `gymFieldSchema.safeParse` now rejects for the new `horarioJson` variant (the `horario` literal no longer exists). Admins see a Zod error toast on save. Mitigation: merge Slice 2 within hours.

**Slice 2 (UI)** — new editor, new public renderer, GymConfigManager swap, E2E + new unit tests. After merge, the form works end-to-end.

Rollback: revert Slice 2 (UI) → form reverts to a no-op broken state, requires reverting Slice 1 to fully restore the textarea. Reverse the chain. Acceptable: `horarioJson: null` is the "render nothing" state, identical UX to today's `horario: null` after a clean drop.

## Caching & Revalidation

No changes to the cache layer. `getGymConfigForServer` already reads any field that exists on `Gym`. `updateGymField` already calls `(revalidateTag as any)("gym-config")` + `revalidatePath("/")` + `revalidatePath("/informacion")` + `revalidatePath("/admin")`. The `horarioJson` field flows through the existing reader with the existing tag — Zod narrows the type at the read boundary.

## Open Questions

- [x] **Render layout for `HoursSection`**: single-line string (proposal's chosen format) — confirmed in proposal. **Resolved.**
- [x] **Chained PR strategy**: confirmed in proposal. **Resolved.**
- [x] **Data migration of `horario` text**: hard drop, no parse. **Resolved (pre-launch, no real users).**
- [ ] **Cross-midnight schedules**: out of scope for v1; documented in the proposal as a known limitation. No blocker.
