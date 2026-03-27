# Delta for Feriados Duplicates Prevention

## Purpose

This spec defines requirements and scenarios for preventing duplicate Feriado (holiday) records within the same gym. The system MUST enforce uniqueness on the combination of `(gymId, fecha)` at both the database and API layers.

---

## ADDED Requirements

### Requirement: Unique Constraint on Feriado Date Per Gym

The system MUST enforce a unique constraint on the combination of `(gymId, fecha)` fields in the Feriado model. No two Feriado records SHALL exist for the same gym on the same calendar date.

#### Scenario: Create first holiday for a date

- GIVEN no Feriado exists for gym "gym" on date "2026-12-25"
- WHEN a user creates a new Feriado with fecha "2026-12-25"
- THEN the creation MUST succeed
- AND the Feriado record SHALL be stored with fecha normalized to YYYY-MM-DD

#### Scenario: Create duplicate holiday for same date

- GIVEN a Feriado exists for gym "gym" on date "2026-12-25"
- WHEN a user attempts to create another Feriado with fecha "2026-12-25" for the same gym
- THEN the creation MUST be rejected with HTTP 409 Conflict
- AND the response MUST contain `error: "Ya existe un feriados para esta fecha"` and `code: "DUPLICATE"`

#### Scenario: Same date different gym is allowed

- GIVEN a Feriado exists for gym "gym" on date "2026-12-25"
- WHEN a user creates a Feriado with fecha "2026-12-25" for gym "other-gym"
- THEN the creation MUST succeed
- AND each gym SHALL have its own independent holiday schedule

#### Scenario: Race condition - simultaneous duplicate creation

- GIVEN no Feriado exists for gym "gym" on date "2026-12-31"
- WHEN two users simultaneously create a Feriado with fecha "2026-12-31" for the same gym
- THEN exactly one creation MUST succeed
- AND the other creation MUST be rejected with HTTP 409 Conflict
- AND the database constraint SHALL be the source of truth determining which request wins

---

### Requirement: Date Normalization to YYYY-MM-DD

The system MUST normalize all Feriado dates to YYYY-MM-DD format (ISO 8601 date-only) before storage. Any time component SHALL be stripped.

#### Scenario: Date with time component is normalized

- GIVEN a user submits a Feriado with fecha "2026-12-25T14:30:00.000Z"
- WHEN the date is processed for storage
- THEN the stored fecha MUST be "2026-12-25" (YYYY-MM-DD format)
- AND the time component MUST be stripped

#### Scenario: Date-only input is stored unchanged

- GIVEN a user submits a Feriado with fecha "2026-12-25"
- WHEN the date is processed for storage
- THEN the stored fecha MUST be "2026-12-25"
- AND no modification SHALL occur

#### Scenario: Different times on same date are still blocked

- GIVEN a Feriado exists with fecha normalized to "2026-02-29" (leap year)
- WHEN a user attempts to create a Feriado with fecha "2026-02-29T08:00:00.000Z"
- THEN the creation MUST be rejected with HTTP 409 Conflict
- AND the reason is that the date portion matches, regardless of time

---

### Requirement: API Returns 409 Conflict on Duplicate

The system MUST return HTTP 409 Conflict when a Feriado create operation would violate the unique constraint.

#### Scenario: API handles P2002 Prisma error

- GIVEN a user attempts to create a duplicate Feriado
- WHEN the Prisma client throws error code "P2002" (unique constraint violation)
- THEN the API route MUST return HTTP 409 with body `{ "error": "Ya existe un feriado para esta fecha", "code": "DUPLICATE" }`

#### Scenario: API returns generic error for other failures

- GIVEN a user attempts to create a Feriado and an unexpected error occurs
- WHEN the error is not a unique constraint violation
- THEN the API route MUST return appropriate HTTP status (4xx or 5xx)
- AND the response body MUST contain `error` field with descriptive message

---

### Requirement: Database Constraint as Last Line of Defense

The database unique constraint on `(gymId, fecha)` SHALL be the authoritative enforcement mechanism for duplicate prevention. Race conditions SHALL be handled by the database, not by application-level locking.

#### Scenario: Pre-check passes but constraint fails (race condition)

- GIVEN two concurrent requests both pass the pre-check (no existing Feriado found)
- WHEN both requests attempt to create a Feriado with the same fecha
- THEN exactly one SHALL succeed due to database constraint
- AND the other SHALL receive HTTP 409 Conflict
- AND no data corruption SHALL occur

---

### Requirement: Server Action Pre-check Validation

The system SHOULD perform an early duplicate check in server actions before attempting database insertion to provide faster feedback and better UX.

#### Scenario: Server action pre-check prevents duplicate

- GIVEN a Feriado exists with fecha "2026-01-01"
- WHEN `createFeriado` server action is called with fecha "2026-01-01" for the same gym
- THEN the server action MUST return `{ success: false, error: "Duplicate", statusCode: 409 }`
- AND no database query SHALL be attempted

#### Scenario: Server action pre-check allows unique creation

- GIVEN no Feriado exists with fecha "2026-01-01"
- WHEN `createFeriado` server action is called with fecha "2026-01-01"
- THEN the server action SHALL proceed to create the record
- AND return `{ success: true, data: { ... created Feriado } }`

---

### Requirement: FormState Enhancement for Error Differentiation

The FormState interface MUST include a `statusCode` field to enable proper error differentiation between different HTTP response types.

#### Scenario: Successful response has no statusCode

- GIVEN a Feriado creation succeeds
- WHEN the server action returns
- THEN the FormState SHALL be `{ success: true, data: { ... } }`
- AND `statusCode` MAY be undefined

#### Scenario: Conflict error response includes statusCode 409

- GIVEN a duplicate Feriado creation is attempted
- WHEN the server action returns
- THEN the FormState SHALL be `{ success: false, error: "Duplicate", statusCode: 409, code: "DUPLICATE" }`

#### Scenario: Validation error response includes appropriate statusCode

- GIVEN an invalid Feriado creation is attempted (e.g., missing required field)
- WHEN the server action returns
- THEN the FormState SHALL be `{ success: false, error: "Validation error message", statusCode: 400 }`

---

### Requirement: Frontend Toast Feedback for Duplicate Errors

The frontend MUST display a specific toast message when a Feriado duplicate error (409 Conflict) occurs, distinct from generic error messages.

#### Scenario: Duplicate error shows specific toast

- GIVEN a user attempts to create a duplicate Feriado
- WHEN the server action returns `statusCode: 409`
- THEN the UI MUST display toast error "Ya existe un feriado para esta fecha"
- AND the toast duration SHOULD be 4000ms

#### Scenario: Generic error shows generic toast

- GIVEN a user encounters an unexpected error during Feriado creation
- WHEN the server action returns without statusCode 409
- THEN the UI SHOULD display toast error "Error al guardar"
- AND the specific duplicate message SHALL NOT be shown

---

## EDGE CASES

### Requirement: Timezone Handling

The system MUST handle timezone differences consistently by storing dates in UTC and normalizing to YYYY-MM-DD at storage boundary.

#### Scenario: Different timezone input produces same stored date

- GIVEN a user in UTC-3 submits fecha "2026-07-04" (which represents July 4th in their local time)
- WHEN the date is normalized using `normalizeToDate()` utility
- THEN the result MUST be "2026-07-04" (the calendar date, not the instant)
- AND storage MUST use UTC midnight or YYYY-MM-DD string format

#### Scenario: Year boundary dates are preserved

- GIVEN a Feriado exists for gym "gym" on date "2026-12-31"
- WHEN another user attempts to create a Feriado for "2027-01-01"
- THEN the creation MUST succeed (different dates)
- AND the existing "2026-12-31" Feriado SHALL NOT be affected

#### Scenario: Leap year Feb 29 is valid

- GIVEN no Feriado exists on 2028-02-29
- WHEN a user creates a Feriado with fecha "2028-02-29"
- THEN the creation MUST succeed
- AND the stored fecha MUST be "2028-02-29"

#### Scenario: Empty date is rejected

- GIVEN a user submits a Feriado with empty or null fecha
- WHEN the date normalization is attempted
- THEN the system MUST reject the submission with HTTP 400
- AND the response MUST indicate "Fecha es requerida"

#### Scenario: Invalid date format is rejected

- GIVEN a user submits a Feriado with fecha "not-a-date"
- WHEN the date validation fails
- THEN the system MUST reject the submission with HTTP 400
- AND the response MUST indicate "Fecha inválida"

---

## MODIFIED Requirements

### Requirement: Feriado Data Model

The `Feriado` model in Prisma schema MUST include a unique constraint on the combination of `(gymId, fecha)`.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | @id @default(uuid()) | Holiday identifier |
| fecha | DateTime | @unique([gymId, fecha]) | Holiday date (normalized to YYYY-MM-DD) |
| gymId | String | default "gym", indexed | Foreign key to Gym |
| createdAt | DateTime | @default(now()) | Record creation timestamp |
| gym | Gym | @relation(fields: [gymId], references: [id], onDelete: Cascade) | Relation to Gym |

(Previously: no unique constraint existed on fecha)

---

## REMOVED Requirements

None.

---

## Files Affected

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | MODIFY - Add `@@unique([gymId, fecha])` on Feriado model |
| `src/lib/dates.ts` | NEW - Add `normalizeToDate()` utility function |
| `src/app/api/feriados/route.ts` | MODIFY - Handle P2002 → 409 Conflict |
| `src/app/actions/feriados.ts` | MODIFY - Add pre-check duplicate + statusCode in FormState |
| `src/components/feriado-manager.tsx` | MODIFY - Handle 409 in toast messages |

---

## Acceptance Criteria

| ID | Criterion | Verification |
|----|-----------|--------------|
| FDD1 | Migration adds unique constraint without blocking on existing duplicates | Test migration on staging |
| FDD2 | Creating duplicate Feriado returns 409 Conflict | API test with duplicate data |
| FDD3 | Date is stored normalized (YYYY-MM-DD, no time) | Database inspection after create |
| FDD4 | Frontend shows "Ya existe un feriado para esta fecha" on duplicate | Manual UI test |
| FDD5 | FormState correctly passes statusCode from server action | Unit test or integration test |
| FDD6 | Race condition handled (one succeeds, one gets 409) | Concurrent request test |
| FDD7 | Same date different gym is allowed | Create for two gyms same date |

---

## Scenario Coverage Summary

| Category | Covered | Missing |
|----------|---------|---------|
| Happy path (unique create) | S1 | - |
| Duplicate rejection | S2 | - |
| Race condition | S3 | - |
| Time ignored in comparison | S4 | - |
| Migration safety | S5 | - |
| Timezone handling | - | Covered in edge cases |
| Leap year | - | Covered in edge cases |
| Year boundary | - | Covered in edge cases |
| Empty date | - | Covered in edge cases |
| Invalid format | - | Covered in edge cases |
