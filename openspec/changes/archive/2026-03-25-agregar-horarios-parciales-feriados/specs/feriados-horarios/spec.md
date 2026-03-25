# Delta for Feriado Scheduling

## ADDED Requirements

### Requirement: Partial-Day Holiday Support

The system SHALL support holidays that close only for a portion of the day (e.g., closing at 14:00 on Christmas Eve) in addition to full-day holidays.

A partial-day holiday MUST specify both an opening time (`hora_inicio`) and closing time (`hora_fin`).

#### Scenario: Create partial-day holiday

- GIVEN the admin is on the holiday management page
- WHEN the admin unchecks "Día completo" and enters a start time of "08:00" and end time of "14:00"
- THEN the system SHALL create a holiday with `todo_dia=false`, `hora_inicio="08:00"`, and `hora_fin="14:00"`

#### Scenario: Create full-day holiday (default)

- GIVEN the admin is on the holiday management page
- WHEN the admin leaves "Día completo" checked (or does not specify times)
- THEN the system SHALL create a holiday with `todo_dia=true`, `hora_inicio=null`, and `hora_fin=null`

#### Scenario: Display partial-day holiday on public page

- GIVEN a partial-day holiday exists with `todo_dia=false`, `hora_inicio="08:00"`, `hora_fin="14:00"`
- WHEN the public holidays page renders
- THEN the holiday SHALL be displayed as "24 de Diciembre de 2026 — Abierto de 08:00 a 14:00"

#### Scenario: Display full-day holiday on public page

- GIVEN a full-day holiday exists with `todo_dia=true`
- WHEN the public holidays page renders
- THEN the holiday SHALL be displayed as "25 de Diciembre de 2026 — Todo el día"

### Requirement: Time Validation

The system MUST validate that when `todo_dia=false`, both `hora_inicio` and `hora_fin` are provided.

The system MUST validate that `hora_inicio` is strictly less than `hora_fin`.

#### Scenario: Reject partial holiday without both times

- GIVEN the admin submits a holiday with `todo_dia=false` but only `hora_inicio` provided
- WHEN the form is submitted
- THEN the system SHALL reject the submission with error "Hora de inicio y fin son requeridas para horarios parciales"

#### Scenario: Reject invalid time range

- GIVEN the admin submits a holiday with `hora_inicio="15:00"` and `hora_fin="08:00"`
- WHEN the form is submitted
- THEN the system SHALL reject the submission with error "La hora de inicio debe ser anterior a la hora de fin"

### Requirement: Backward Compatibility

Existing holiday records in the database MUST continue to function correctly after migration.

All existing holidays MUST default to `todo_dia=true` with null times.

#### Scenario: Existing holidays retain full-day behavior

- GIVEN a database with existing holiday records created before this change
- WHEN the migration is applied
- THEN all existing records SHALL have `todo_dia=true` and null `hora_inicio`/`hora_fin`
- AND the public UI SHALL display these holidays as "Todo el día"

## MODIFIED Requirements

### Requirement: Feriado Data Model

The `Feriado` model MUST include three new fields:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `todo_dia` | Boolean | `@default(true)` | `true` = full day, `false` = partial |
| `hora_inicio` | String? | `@db.Time`, nullable | Opening time when `todo_dia=false` |
| `hora_fin` | String? | `@db.Time`, nullable | Closing time when `todo_dia=false` |

(Previously: `Feriado` model only had `id`, `fecha`, `createdAt`, `gymId`)

### Requirement: Feriado Schema Validation

The `feriadoSchema` in `src/lib/schemas.ts` MUST accept the new fields with cross-field validation.

The schema MUST enforce:
1. If `todo_dia=false`, then `hora_inicio` and `hora_fin` are required
2. If both times are provided, `hora_inicio` MUST be strictly less than `hora_fin`

(Previously: schema only validated `fecha` field)

### Requirement: API Response Shape

The GET `/api/feriados` endpoint MUST return `todo_dia`, `hora_inicio`, and `hora_fin` for each holiday.

The POST `/api/feriados` endpoint MUST accept `todo_dia`, `hora_inicio`, and `hora_fin` in the request body.

(Previously: API responses only included `id`, `fecha`, `createdAt`)

## REMOVED Requirements

None.

---

## Scenarios Coverage

| Scenario | Type | Covered |
|----------|------|---------|
| Create partial-day holiday | Happy path | ✅ |
| Create full-day holiday | Happy path | ✅ |
| Display partial-day on public page | Happy path | ✅ |
| Display full-day on public page | Happy path | ✅ |
| Reject partial without times | Error | ✅ |
| Reject invalid time range | Error | ✅ |
| Existing holidays backward compatible | Edge case | ✅ |
