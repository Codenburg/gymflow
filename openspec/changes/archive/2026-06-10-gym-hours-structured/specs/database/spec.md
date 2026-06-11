# Delta for Database

## MODIFIED Requirements

### Requirement: Gym Singleton Model

The system MUST store gym configuration in a singleton database record with fixed ID "gym". The record MUST include display information fields (`nombre`, `horarioJson`, `direccion`, `mapsEmbedUrl`, `socialInstagram`, `socialWhatsapp`) in addition to the existing `price` field.
(Previously: Stored `horario` as a free-text `String?` column; admins could write arbitrary strings.)

#### Scenario: Create Gym singleton record

- GIVEN No Gym record exists in the database
- WHEN The seed script executes
- THEN A Gym record with id "gym" and price 45000 MUST be created
- AND display information fields MUST be NULL by default until an admin configures them

#### Scenario: Gym record persists across deployments

- GIVEN A Gym record with id "gym" already exists in the database
- WHEN The seed script executes
- THEN The existing Gym record MUST NOT be modified (upsert behavior)

#### Scenario: Gym stores structured hours

- GIVEN An admin saves a per-day schedule with `lun.abierto = true, lun.apertura = "08:00", lun.cierre = "22:00"`
- WHEN The Gym record is updated
- THEN `horarioJson` MUST be persisted as a JSON object whose `lun` entry matches the submitted day
- AND subsequent reads MUST return the updated structured value
- AND the `horario` (free-text) column MUST NOT exist

### Requirement: Gym Display Fields Schema

The Gym model MUST expose five optional String fields (`nombre`, `direccion`, `mapsEmbedUrl`, `socialInstagram`, `socialWhatsapp`) and one optional `Json?` field (`horarioJson`) for admin-managed display content. All fields are nullable; the application layer is responsible for fallback handling when a field is NULL.
(Previously: The model exposed six optional String fields, including free-text `horario`.)

#### Scenario: Display fields exist on Gym model

- GIVEN Prisma schema is configured
- WHEN the schema is parsed
- THEN the Gym model MUST include: `nombre`, `horarioJson`, `direccion`, `mapsEmbedUrl`, `socialInstagram`, `socialWhatsapp`
- AND five String fields MUST be nullable
- AND `horarioJson` MUST be of type `Json?` (nullable)
- AND a `horario` String column MUST NOT exist on the Gym model

#### Scenario: horarioJson column type and storage

- GIVEN The Gym model is migrated
- WHEN the schema is parsed
- THEN `horarioJson` MUST map to PostgreSQL `JSONB`
- AND Prisma SHOULD expose the field as `Prisma.JsonValue` (the application narrows with Zod at every read boundary)

#### Scenario: horario column dropped without data preservation

- GIVEN A database with a Gym record whose `horario` column contains pre-existing free-text
- WHEN the destructive migration runs
- THEN the `horario` column MUST be removed
- AND the previous free-text value MUST NOT be preserved (no parse attempt)
- AND `horarioJson` MUST default to NULL for the existing row

#### Scenario: Long address text supported

- GIVEN An admin enters a `direccion` value longer than 200 characters
- WHEN the Gym record is saved
- THEN the value MUST be persisted without truncation (use `@db.Text` for unbounded text)

#### Scenario: URL fields accept embed-sized strings

- GIVEN An admin enters a `mapsEmbedUrl` value with query parameters
- WHEN the Gym record is saved
- THEN the value MUST be persisted as-is (validation is the application's responsibility)

### Data Models

#### Gym Model (Modified)

| Field             | Type     | Constraints | Description |
|-------------------|----------|-------------|-------------|
| id                | String   | @id, fixed "gym" | Singleton identifier |
| price             | Decimal  | required | Monthly subscription price |
| nombre            | String?  | nullable | Display name shown in headers, metadata, login |
| horarioJson       | Json?    | nullable | Structured weekly hours — object with 7 day keys (lun..dom) |
| direccion         | String?  | @db.Text, nullable | Physical address |
| mapsEmbedUrl      | String?  | @db.Text, nullable | Google Maps embed iframe URL |
| socialInstagram   | String?  | nullable | Full Instagram profile URL |
| socialWhatsapp    | String?  | nullable | Full WhatsApp contact URL (wa.me format) |
| createdAt         | DateTime | @default(now()) | Record creation timestamp |
| updatedAt         | DateTime | @updatedAt | Last modification timestamp |

> `horario` String column is REMOVED. `horarioJson` REPLACES it. See `HorarioSemanal` shape in the `gym-config` spec.
