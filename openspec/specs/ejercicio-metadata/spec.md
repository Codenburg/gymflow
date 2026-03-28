# Delta for Ejercicio Metadata

## Purpose

This spec defines the metadata fields for exercises, specifically series and repetitions (but not weights).

## Data Model

### Database (Prisma)

```prisma
model Ejercicio {
  id        String   @id @default(uuid())
  diaId     String
  nombre    String
  series    Int?    // Optional, stored as integer (not string)
  repes     Int?     // Optional, stored as integer (not string)
  orden     Int      @default(0)
  // ...
}
```

### UI Representation

The UI uses a single unified format: `NxN` (e.g., "4x12")

- Input: Single text field with placeholder "4x12"
- Display: "4x12" format
- Validation: Regex `^\d+x\d+$` enforced at schema level

### Schema Transformation

```typescript
// UI sends: "4x12" (string)
// Schema parses to: { series: 4, repes: 12 } (Int)
// DB receives: series: 4, repes: 12 (Int)
```

## ADDED Requirements

### Requirement: Ejercicio Has Series and Repes as Integers

The Ejercicio model MUST store optional metadata for series and repetitions as integers.

- GIVEN an ejercicio exists in the database
- WHEN retrieving the ejercicio
- THEN the response SHALL include optional `series` and `repes` fields as integers
- AND these fields SHALL be nullable (optional)

#### Scenario: Exercise with series and reps

- GIVEN an ejercicio has series = 3 and repes = 12
- WHEN the API returns the ejercicio
- THEN the response SHALL include `series`: 3 and `repes`: 12
- AND the UI SHALL display "3x12"

#### Scenario: Exercise without metadata

- GIVEN an ejercicio has no series/repes (null)
- WHEN the UI displays the exercise
- THEN it SHALL NOT show any series/repes information
- AND the field SHALL be null in the API response

### Requirement: UI Uses Single Formato Input

The UI MUST use a single input field for the `NxN` format instead of separate series/repes inputs.

#### Scenario: Create/Edit exercise with formato

- GIVEN a user is creating or editing an ejercicio
- WHEN the user enters "4x12" in the formato field
- THEN the system SHALL parse this as series: 4, repes: 12
- AND store in database as integers

#### Scenario: Formato validation

- GIVEN a user enters "abc" in the formato field
- THEN the system SHALL show validation error "Formato inválido (usar 4x12)"
- AND not allow submission

#### Scenario: Empty formato

- GIVEN a user leaves the formato field empty
- THEN the system SHALL store series: null, repes: null
- AND no validation error SHALL occur

### Requirement: API Response Includes Metadata

The API endpoints that return ejercicios MUST include the new fields.

#### Scenario: GET /api/rutinas/[id] includes metadata

- GIVEN a rutina exists with dias and ejercicios
- WHEN the client calls GET /api/rutinas/[id]
- THEN each ejercicio SHALL include `series` and `repes` fields

#### Scenario: GET /api/rutinas/[id]/dias/[diaId] includes metadata

- GIVEN a dia exists with ejercicios
- WHEN the client calls GET /api/rutinas/[id]/dias/[diaId]
- THEN each ejercicio SHALL include `series` and `repes` fields

### Requirement: UI Displays Series x Repes

The UI MUST display the series and repetitions in a readable format.

#### Scenario: Display format "NxN"

- GIVEN an ejercicio has series = 3 and repes = 12
- WHEN the UI renders the exercise card
- THEN it SHALL display "3x12" (series x repes)

#### Scenario: No metadata to display

- GIVEN an ejercicio has no series/repes (null)
- WHEN the UI renders the exercise card
- THEN it SHALL NOT display any series/repes text

## MODIFIED Requirements

### Requirement: Seed Data Includes Metadata

The seed script SHALL populate ejercicios with series and repes values as integers.

(Previously: Seed included "3x12" strings; Now: Seed includes integers like series: 3, repes: 12)

## Edge Cases

### Scenario: Invalid format

- GIVEN formato = "abc" or "4x" or "x12"
- THEN validation SHALL fail with message "Formato inválido (usar 4x12)"

### Scenario: Numbers out of range

- GIVEN formato = "100x100"
- THEN validation SHALL fail (max 99 for series/repes)

### Scenario: Negative numbers

- GIVEN formato = "-4x12"
- THEN validation SHALL fail (positive numbers only)
