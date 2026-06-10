# Delta for Gym Configuration

## MODIFIED Requirements

### Requirement: Public Gym Data Consumption

Server Components and Server Actions MUST read the current gym configuration from the database and render it in headers, sidebars, and public information sections. The public `HoursSection` MUST consume `horarioJson` (a structured weekly object), format it as a uniform single-line string, and never render the admin's free-text input.
(Previously: Public `HoursSection` rendered a single free-text `horario` string verbatim.)

#### Scenario: Public page reads gym name

- GIVEN a Gym record exists with `nombre = "Titanium Gym"`
- WHEN the homepage Server Component renders
- THEN the rendered output MUST contain the string "Titanium Gym"

#### Scenario: Public page reads hours from structured data

- GIVEN `horarioJson` contains `{ lun: { abierto: true, apertura: "08:00", cierre: "22:00" }, ..., vie: { abierto: true, apertura: "08:00", cierre: "22:00" }, sab: { abierto: true, apertura: "09:00", cierre: "14:00" }, dom: { abierto: false, apertura: null, cierre: null } }`
- WHEN `HoursSection` renders
- THEN the output MUST contain the formatted string "Lun a Vie 8:00 a 22:00 · Sáb 9:00 a 14:00 · Dom cerrado"

#### Scenario: Public page reads address and maps embed

- GIVEN `direccion = "Av. Siempre Viva 742"` and `mapsEmbedUrl = "https://www.google.com/maps/embed?..."`
- WHEN `AddressSection` renders
- THEN the output MUST contain "Av. Siempre Viva 742"
- AND the `<iframe>` `src` MUST equal the stored mapsEmbedUrl

#### Scenario: Public page reads social links

- GIVEN `socialInstagram = "https://instagram.com/titanium"` and `socialWhatsapp = "https://wa.me/5491112345678"`
- WHEN `SocialLinksSection` renders
- THEN the Instagram `href` MUST equal the stored Instagram URL
- AND the WhatsApp `href` MUST equal the stored WhatsApp URL

#### Scenario: NULL horarioJson hides the hours section

- GIVEN a Gym record with `horarioJson = null` (unconfigured)
- WHEN the public page renders
- THEN the `HoursSection` MUST render an empty state (hidden or placeholder)
- AND the component MUST NOT throw

#### Scenario: All-closed horarioJson hides the hours section

- GIVEN `horarioJson` exists but every day has `abierto: false`
- WHEN `HoursSection` renders
- THEN the section MUST be hidden (no output, no fake content)
- AND the component MUST NOT throw

#### Scenario: NULL fields render empty, not fake data

- GIVEN a Gym record with `nombre` and `price` set, but all new display fields are NULL
- WHEN any public component renders
- THEN the component MUST NOT throw
- AND sections depending on a NULL field MUST render an empty/placeholder state (never hardcoded fake data)

### Requirement: Admin Gym Configuration Page

The system MUST provide `/admin/config`, auth-guarded by the existing admin middleware, that lets authenticated admins view and edit all gym configuration fields. The Hours & Address group MUST render a per-day schedule editor (7 day cards) instead of a free-text `horario` textarea.
(Previously: The Hours & Address group exposed a single `<textarea>` for `horario`.)

#### Scenario: Admin opens config page

- GIVEN an authenticated admin visits `/admin/config`
- WHEN the page renders
- THEN a form MUST display inputs for: nombre, direccion, mapsEmbedUrl, socialInstagram, socialWhatsapp
- AND a per-day schedule editor MUST be rendered in place of the previous `horario` textarea, with 7 day cards
- AND each day card MUST be pre-filled with the current DB value (one for `lun`, `mar`, `mie`, `jue`, `vie`, `sab`, `dom`)

#### Scenario: Non-admin redirected

- GIVEN an authenticated non-admin (role USER or TRAINER) navigates to `/admin/config`
- WHEN the page resolves
- THEN the user MUST be redirected per existing RBAC rules (USER → homepage, TRAINER → `/admin/rutinas`)

#### Scenario: Unauthenticated redirected

- GIVEN no authenticated session
- WHEN a request is made to `/admin/config`
- THEN the user MUST be redirected to `/admin/login`

### Requirement: Input Validation

All gym config input MUST be validated server-side via Zod. Errors MUST be returned in `FormState<T>` and rendered near the offending input. The `horarioJson` field MUST be validated against the `HorarioSemanal` Zod schema; malformed payloads (invalid time format, missing required day keys) MUST be rejected.
(Previously: `horario` was validated as a trimmed string of 1–200 chars.)

#### Scenario: Empty name rejected

- GIVEN an admin submits `nombre = ""`
- WHEN the server action validates
- THEN it MUST return `{ success: false, errors: { nombre: "..." } }`
- AND the DB MUST NOT be updated

#### Scenario: Invalid URL rejected for mapsEmbedUrl

- GIVEN `mapsEmbedUrl = "not-a-url"`
- WHEN the server action validates
- THEN it MUST return a validation error for `mapsEmbedUrl`
- AND the DB MUST NOT be updated

#### Scenario: Invalid URL rejected for social links

- GIVEN `socialInstagram` or `socialWhatsapp` is a non-URL string
- WHEN the server action validates
- THEN it MUST return a validation error for the offending field
- AND the DB MUST NOT be updated

#### Scenario: Malformed horarioJson rejected

- GIVEN an admin submits a `horarioJson` payload with an invalid time string (e.g. `apertura = "25:99"`) or a missing day key
- WHEN the server action validates
- THEN it MUST return a validation error for `horarioJson`
- AND the DB MUST NOT be updated

#### Scenario: Optional fields accept empty

- GIVEN an admin submits `horarioJson = null`, or empty values for `direccion`, `mapsEmbedUrl`, `socialInstagram`, `socialWhatsapp`
- WHEN the server action validates
- THEN the request MUST be accepted and NULL values persisted (these fields are optional)

## ADDED Requirements

### Requirement: Horario Data Structure

The system MUST define a Zod-validated `HorarioSemanal` shape for storing weekly operating hours. The structure MUST have seven fixed day keys (`lun`, `mar`, `mie`, `jue`, `vie`, `sab`, `dom`), and each day MUST be a `HorarioDia` object with `abierto: boolean`, `apertura: string | null`, and `cierre: string | null`. Time values MUST be `HH:MM` 24-hour strings validated by a regex.

#### Scenario: HorarioDia schema

- GIVEN a `HorarioDia` value `{ abierto: true, apertura: "08:00", cierre: "22:00" }`
- WHEN validated by `horarioDiaSchema`
- THEN validation MUST succeed

#### Scenario: Invalid time format rejected

- GIVEN a `HorarioDia` value `{ abierto: true, apertura: "25:99", cierre: "22:00" }`
- WHEN validated by `horarioDiaSchema`
- THEN validation MUST fail with a path-scoped error on `apertura`

#### Scenario: HorarioSemanal requires all seven day keys

- GIVEN a payload missing the `dom` key
- WHEN validated by `horarioSemanalSchema`
- THEN validation MUST fail

#### Scenario: Closed day allows null times

- GIVEN `{ abierto: false, apertura: null, cierre: null }`
- WHEN validated by `horarioDiaSchema`
- THEN validation MUST succeed

#### Scenario: HorarioSemanal can be null

- GIVEN the admin clears the schedule (all-closed or unconfigured)
- WHEN the field is set to `null` at the boundary
- THEN the application MUST accept and persist `null`

### Requirement: Public Hours Section Renders Single-Line String

The public `HoursSection` component MUST be a pure formatting function: given a `HorarioSemanal` object (or `null`), it MUST produce a single-line string using these rules:
- Consecutive open days with identical hours are grouped as `"<DíaIni> a <DíaFin> <apertura> a <cierre>"`.
- Each group is separated by `" · "` (middle dot with surrounding spaces).
- A closed day is rendered as `"<Día> cerrado"`.
- If `horarioJson` is `null` OR every day is closed, the section MUST render nothing (hidden state — no fake content).

The component MUST NOT depend on any free-text input from the admin. The application controls the format.

#### Scenario: Consecutive open days grouped

- GIVEN Mon–Fri all open with `08:00–22:00` and Sat open with `09:00–14:00` and Sun closed
- WHEN `HoursSection` renders
- THEN the rendered text MUST be `"Lun a Vie 8:00 a 22:00 · Sáb 9:00 a 14:00 · Dom cerrado"`

#### Scenario: Single open day not grouped

- GIVEN only `lun` is open (rest closed)
- WHEN `HoursSection` renders
- THEN the output MUST list the single day as `"Lun 8:00 a 22:00"` (no "Lun a Lun")
- AND the closed days MUST be enumerated as `"Mar cerrado · Mie cerrado · ..."`

#### Scenario: Non-consecutive open days listed separately

- GIVEN `lun`, `mie`, `vie` open with same hours, and `mar`, `jue` closed
- WHEN `HoursSection` renders
- THEN the output MUST list `"Lun cerrado · Mar 8:00 a 22:00 · Mie cerrado · Jue 8:00 a 22:00 · Vie cerrado"` OR equivalent grouping — closed days are spelled out, and open days form their own segments

#### Scenario: All-closed hides the section

- GIVEN every day has `abierto: false`
- WHEN `HoursSection` renders
- THEN no text MUST be rendered (the section is hidden)

#### Scenario: Null horarioJson hides the section

- GIVEN `horarioJson = null`
- WHEN `HoursSection` renders
- THEN no text MUST be rendered (the section is hidden)

#### Scenario: Time strings parsed consistently

- GIVEN a `HorarioSemanal` with times like `"08:00"`, `"9:30"`, `"22:00"`
- WHEN `HoursSection` formats the output
- THEN the times MUST be rendered without leading zeros on the hour where culturally appropriate (e.g. `8:00`, `9:30`, `22:00`) — the exact normalization rule is implementation-defined but MUST be consistent across the rendered string
