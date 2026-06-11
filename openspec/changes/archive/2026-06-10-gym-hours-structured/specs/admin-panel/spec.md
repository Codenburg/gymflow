# Delta for Admin Panel

## MODIFIED Requirements

### Requirement: Admin Config Form Layout

The `/admin/config` page MUST render a form organized into logical field groups, matching the existing `FormState<T>` + `useActionState` pattern used by `GymPriceEditor`. Each group MUST be independently submittable so an admin can save one section without re-validating the others. The Hours & Address group MUST replace its previous free-text `horario` textarea with a `WeeklyScheduleEditor` component that renders 7 day cards in a fixed order.
(Previously: The Hours & Address group exposed a single `<textarea>` for `horario`.)

#### Scenario: Config page renders all field groups

- GIVEN an authenticated admin visits `/admin/config`
- WHEN the page renders
- THEN a form MUST display input fields grouped as: Identity (nombre), Hours & Address (WeeklyScheduleEditor + direccion + mapsEmbedUrl), Social (socialInstagram, socialWhatsapp)
- AND each group MUST have its own "Guardar" button
- AND the WeeklyScheduleEditor MUST display 7 day cards in order: lun, mar, mie, jue, vie, sab, dom

#### Scenario: Schedule editor renders one card per day

- GIVEN the WeeklyScheduleEditor mounts on `/admin/config`
- WHEN the editor renders
- THEN 7 cards MUST be visible, one per weekday in fixed order (lun → dom)
- AND each card MUST show: a day label, an Abierto/Cerrado switch, an Apertura time input, a Cierre time input

#### Scenario: Closed day disables time inputs

- GIVEN a day card with the Abierto switch toggled OFF
- WHEN the card renders
- THEN the Apertura and Cierre time inputs MUST be disabled (or visually inert)
- AND the persisted value for that day MUST be `{ abierto: false, apertura: null, cierre: null }`

#### Scenario: Open day enables time inputs

- GIVEN a day card with the Abierto switch toggled ON
- WHEN the card renders
- THEN the Apertura and Cierre time inputs MUST be enabled
- AND both inputs MUST be required for the form to submit successfully (Zod enforces non-null when `abierto: true`)

#### Scenario: Inputs sync with server state

- GIVEN the Gym record is updated by another admin while the form is open
- WHEN the page re-fetches (e.g., after a save in another tab)
- THEN the input fields MUST re-sync with the latest server values
- AND the implementation MUST follow the controlled-or-key-resync rule from `react_rules.server_action_inputs` in `openspec/config.yaml`

#### Scenario: Validation errors display inline

- GIVEN an admin submits a group with invalid input (e.g., empty nombre, malformed URL, malformed schedule)
- WHEN the server action returns a `FormState` with `errors`
- THEN the error message MUST be rendered near the offending input
- AND the form MUST remain in edit mode (not collapse or close)

#### Scenario: Success toast on save

- GIVEN an admin submits a group with valid input
- WHEN the server action returns `{ success: true }`
- THEN a success toast MUST be displayed (e.g., "Configuración actualizada")
- AND the page MUST reflect the new persisted values

## ADDED Requirements

### Requirement: WeeklyScheduleEditor interactions

The `WeeklyScheduleEditor` client component MUST provide a per-day editing experience for the structured `horarioJson` payload. The editor MUST submit the full weekly object in a single action call (one submission, not per-day saves).

#### Scenario: Initial state from server

- GIVEN the Gym record has `horarioJson = { lun: { abierto: true, apertura: "08:00", cierre: "22:00" }, ... }`
- WHEN the editor mounts
- THEN each day card MUST be pre-filled with the server value (switch position + time inputs)
- AND the editor MUST send a `field="horarioJson"` submission carrying the full weekly object

#### Scenario: Toggle Abierto updates day state

- GIVEN the admin toggles the Abierto switch for `lun` from OFF to ON
- WHEN the toggle fires
- THEN the editor's local state for `lun.abierto` MUST become `true`
- AND the Apertura/Cierre inputs for that day MUST become enabled
- AND if the previous state had `apertura: null, cierre: null`, the editor SHOULD provide default times (e.g. `09:00–18:00`) so the form can submit

#### Scenario: Toggle Abierto off clears times

- GIVEN the admin toggles the Abierto switch for `lun` from ON to OFF
- WHEN the toggle fires
- THEN the editor's local state for that day MUST be `{ abierto: false, apertura: null, cierre: null }`
- AND the time inputs MUST become disabled

#### Scenario: Edit time inputs

- GIVEN a day is open and the admin changes `apertura` to `07:30`
- WHEN the time input fires `onChange`
- THEN the editor's local state for that day's `apertura` MUST be `"07:30"`
- AND the input MUST use `<input type="time">` for native browser time pickers

#### Scenario: Save submits the full object

- GIVEN the admin clicks the Hours & Address "Guardar" button
- WHEN the form submits
- THEN the editor MUST send a single `updateGymField` call with `field="horarioJson"` and the entire weekly object (all 7 days)
- AND on success, the editor MUST NOT submit per-day

#### Scenario: Per-day data-testid selectors

- GIVEN the editor renders
- WHEN the DOM is queried
- THEN each day card MUST expose a `data-testid="day-card-${code}"` (where `${code}` ∈ {lun, mar, mie, jue, vie, sab, dom})
- AND the Abierto switch MUST expose `data-testid="toggle-${code}"`
- AND the time inputs MUST expose `data-testid="time-${code}-apertura"` and `data-testid="time-${code}-cierre"`

#### Scenario: Validation error renders near editor

- GIVEN the admin submits a malformed `horarioJson` (e.g. one day with `abierto: true` but `apertura: null`)
- WHEN the server action returns a validation error for `horarioJson`
- THEN the editor MUST display the error message at the top of the schedule form
- AND the form MUST remain in edit mode

#### Scenario: Save without changes does not error

- GIVEN the editor pre-fills with the current server state
- AND the admin clicks "Guardar" without modifying any day
- WHEN the form submits
- THEN the server action MUST accept the submission (idempotent)
- AND the action MUST return `{ success: true }`

### Acceptance Criteria

| ID | Criterion |
|----|-----------|
| ACGCA1 | The admin sidebar exposes a "Configuración" nav item linking to `/admin/config`, visible to admins only |
| ACGCA2 | `/admin/config` renders 3 sub-form groups: Identity, Hours & Address, Social, each with its own "Guardar" button |
| ACGCA3 | Inputs use the controlled-or-key-resync pattern (`value` + `onChange`, or `defaultValue` + `key={serverValue}`) to avoid desync |
| ACGCA4 | Inline validation errors render near offending input; form stays in edit mode on error |
| ACGCA5 | A success toast is displayed on `FormState.success === true`; page reflects the new persisted values |
| ACGCA6 | Unauthenticated users are redirected to `/admin/login`; USER role → homepage; TRAINER role → `/admin/rutinas` |
| ACWS1 | `WeeklyScheduleEditor` renders 7 day cards in fixed order (lun, mar, mie, jue, vie, sab, dom) |
| ACWS2 | Each day card exposes `data-testid="day-card-${code}"`, `data-testid="toggle-${code}"`, `data-testid="time-${code}-apertura"`, `data-testid="time-${code}-cierre"` for stable Playwright selectors |
| ACWS3 | Toggling Abierto OFF clears that day's `apertura`/`cierre` to `null` and disables the time inputs; toggling ON enables them |
| ACWS4 | Saving submits the entire `horarioJson` object in a single action call (not per-day) |
| ACWS5 | Closed days persist as `{ abierto: false, apertura: null, cierre: null }`; the form is idempotent on re-save |
