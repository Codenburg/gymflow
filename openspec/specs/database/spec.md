# Database Setup

## ADDED Requirements

### Requirement: PostgreSQL Docker Container

The development environment MUST have a PostgreSQL container running via Docker Compose.

The system MUST be able to connect to PostgreSQL using the connection string in DATABASE_URL environment variable.

#### Scenario: Docker Compose starts PostgreSQL

- GIVEN Docker Desktop is running
- WHEN developer runs `docker compose up -d`
- THEN a PostgreSQL 18.3 container MUST be created and running
- AND the container MUST be accessible on port 5432

#### Scenario: Database connection succeeds

- GIVEN PostgreSQL container is running
- WHEN Prisma Client attempts connection
- THEN the connection MUST succeed without errors

### Requirement: Prisma Schema Models

The schema.prisma file MUST define three models matching the PRD: Rutina, Dia, Ejercicio.

The system MUST enforce referential integrity between these models.

#### Scenario: Rutina model exists

- GIVEN Prisma schema is configured
- WHEN the schema is parsed
- THEN a model named "Rutina" MUST exist with fields: id, nombre, tipo, descripcion
- AND id MUST be a UUID or auto-increment integer
- AND nombre MUST be required (String)

#### Scenario: Dia model exists with relation to Rutina

- GIVEN Prisma schema is configured
- WHEN the schema is parsed
- THEN a model named "Dia" MUST exist with fields: id, nombre, musculos_enfocados
- AND Dia MUST have a required relation to Rutina (one-to-many)
- AND rutina_id MUST be stored in the database

#### Scenario: Ejercicio model exists with relation to Dia

- GIVEN Prisma schema is configured
- WHEN the schema is parsed
- THEN a model named "Ejercicio" MUST exist with fields: id, nombre, orden
- AND Ejercicio MUST have a required relation to Dia (one-to-many)
- AND dia_id MUST be stored in the database

### Requirement: Prisma Client Singleton

The application MUST use a singleton instance of PrismaClient to avoid connection leaks.

The singleton MUST be stored in the global object to persist across hot reloads in development.

#### Scenario: Prisma client is reused across requests

- GIVEN the application is running
- WHEN multiple API requests are made
- THEN the same PrismaClient instance MUST be reused
- AND the database connection pool MUST be shared

#### Scenario: Development mode creates new instance on hot reload

- GIVEN NODE_ENV is not "production"
- WHEN the server hot-reloads
- THEN a new PrismaClient instance MAY be created
- AND the previous instance SHOULD be garbage collected

### Requirement: Build includes Prisma generation

The build script MUST execute `prisma generate` before compiling the Next.js application.

#### Scenario: Build succeeds with Prisma

- GIVEN package.json has correct build script
- WHEN `npm run build` is executed
- THEN `prisma generate` MUST run first
- AND Next.js build MUST compile successfully

### Requirement: Environment variables

The system MUST have DATABASE_URL configured in .env file.

The .env file MUST NOT be committed to version control.

#### Scenario: .env file exists

- GIVEN the project is freshly cloned
- WHEN developer checks for .env
- THEN .env file MUST exist with DATABASE_URL
- AND .env MUST be in .gitignore

### Requirement: Migration execution

The database MUST be migrated to the latest schema using Prisma migrations.

#### Scenario: Migration runs successfully

- GIVEN Prisma schema is defined
- WHEN `npx prisma migrate dev` is executed
- THEN tables MUST be created in PostgreSQL
- AND the migration history MUST be stored in _prisma_migrations table

---

## Gym Singleton Configuration

This section defines requirements for the singleton Gym configuration model.

### Requirement: Gym Singleton Model

The system MUST store gym configuration in a singleton database record with fixed ID "gym". The record MUST include display information fields (`nombre`, `horarioJson`, `direccion`, `mapsEmbedUrl`, `socialInstagram`, `socialWhatsapp`) in addition to the existing `price` field.
(Previously: Stored `horario` as a free-text `String?` column; admins could write arbitrary strings.)

#### Scenario: Create Gym singleton record

- GIVEN No Gym record exists in the database
- WHEN The seed script executes
- THEN A Gym record with id "gym" and price45000 MUST be created
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

- GIVEN An admin enters a `direccion` value longer than200 characters
- WHEN the Gym record is saved
- THEN the value MUST be persisted without truncation (use `@db.Text` for unbounded text)

#### Scenario: URL fields accept embed-sized strings

- GIVEN An admin enters a `mapsEmbedUrl` value with query parameters
- WHEN the Gym record is saved
- THEN the value MUST be persisted as-is (validation is the application's responsibility)

### Requirement: Feriado Gym Relation

The system MUST associate each Feriado (holiday) record with a Gym for data integrity and future multi-gym support.

#### Scenario: New Feriado created with gym relation

- GIVEN A Gym record exists with id "gym"
- WHEN A new Feriado is created via API
- THEN The Feriado MUST have gymId set to "gym" automatically

#### Scenario: Delete Gym cascades to Feriados

- GIVEN Multiple Feriado records exist with gymId "gym"
- WHEN The Gym record is deleted
- THEN All associated Feriado records MUST be deleted automatically (Cascade)

#### Scenario: Gym index query performance

- GIVEN Application frequently queries Feriados by gymId
- WHEN The database receives a query filtering by gymId
- THEN The query MUST utilize an index on gymId for optimal performance

### Requirement: Price Decimal Precision

The system MUST handle monetary values with appropriate precision to avoid floating-point errors.

#### Scenario: Store price as Decimal

- GIVEN A price value of 45000.50 is provided
- WHEN The Gym record is created/updated
- THEN The price MUST be stored with at least 2 decimal places of precision

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

#### Feriado Model (Modified)

| Field     | Type     | Constraints | Description |
|-----------|----------|-------------|-------------|
| id        | String   | @id @default(uuid()) | Holiday identifier |
| fecha     | DateTime | required | Holiday date |
| gymId     | String   | default "gym", indexed | Foreign key to Gym |
| createdAt | DateTime | @default(now()) | Record creation timestamp |
| gym       | Gym      | @relation(fields: [gymId], references: [id], onDelete: Cascade) | Relation to Gym |

### Requirement: Migration Safety

The system MUST ensure migrations can be applied safely to existing databases without data loss.

#### Scenario: Apply migration to fresh database

- GIVEN No tables exist in the database
- WHEN `npx prisma migrate dev` is executed
- THEN Both Gym and modified Feriado tables MUST be created successfully

#### Scenario: Apply migration with existing Feriados

- GIVEN A database with existing Feriado records but no Gym table
- WHEN The migration runs
- THEN All existing Feriado records MUST receive gymId = "gym" as default
- AND No existing data MUST be lost

---

## Better Auth Models

The system uses Better Auth for authentication with Prisma adapter. These models are required for the auth system.

### Requirement: Account Model for Credentials

The Account model MUST be configured to store credentials for the username plugin.

#### Scenario: Account stores username credentials

- GIVEN a user is created for username-based login
- WHEN the account is created
- THEN `accountId` MUST be the username (DNI)
- AND `providerId` MUST be 'credential' (NOT 'username')
- AND `providerType` MUST be 'credential'

#### Scenario: Password is hashed

- GIVEN a user sets or updates their password
- WHEN the password is stored
- THEN it MUST be hashed using bcrypt with 12 salt rounds
- AND the plain text password MUST NOT be stored

### Data Model: Account

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | @id @default(uuid()) | Account identifier |
| userId | String | required, indexed | Foreign key to User |
| accountId | String | required | The username (DNI) for credential lookup |
| providerId | String | required | Must be 'credential' for Better Auth |
| providerType | String | required | Must be 'credential' |
| password | String? | nullable | Bcrypt hashed password |
| createdAt | DateTime | @default(now()) | Creation timestamp |
| updatedAt | DateTime | @updatedAt | Last update timestamp |

### Data Model: Session

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | @id @default(uuid()) | Session identifier |
| userId | String | required, indexed | Foreign key to User |
| token | String | @unique | Session token for authentication |
| expiresAt | DateTime | required | When the session expires |
| ipAddress | String? | nullable | Client IP address |
| userAgent | String? | nullable | Client user agent string |
| createdAt | DateTime | @default(now()) | Creation timestamp |
| updatedAt | DateTime | @updatedAt | Last update timestamp |

### Data Model: Verification

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | @id @default(uuid()) | Verification record identifier |
| identifier | String | required | What is being verified (e.g., email) |
| value | String | required | The verification value/token |
| expiresAt | DateTime | required | When verification expires |
| createdAt | DateTime | @default(now()) | Creation timestamp |

---

## Ownership Audit & Soft Delete Models

This section defines requirements for the User soft delete and OwnershipTransfer audit trail system.

### Requirement: User Soft Delete

The system MUST implement soft delete on the User model to preserve historical data integrity.

#### Scenario: Soft delete marks user as deleted

- GIVEN a user exists in the database
- WHEN `deleteUser` action is called
- THEN `deletedAt` MUST be set to current timestamp
- AND the user record MUST NOT be physically deleted
- AND all user queries for active users MUST filter `deletedAt IS NULL`

#### Scenario: Soft-deleted users excluded from queries

- GIVEN a user has `deletedAt` set to a timestamp
- WHEN any user listing or dropdown query executes
- THEN the soft-deleted user MUST NOT appear in results
- UNLESS explicitly querying for deleted users

### Data Model: User (Extended)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | @id @default(uuid()) | User identifier |
| deletedAt | DateTime? | @db.Timestamp, indexed | NULL = active, timestamp = soft-deleted |
| outgoingTransfers | OwnershipTransfer[] | relation | Transfers initiated by this user |
| incomingTransfers | OwnershipTransfer[] | relation | Transfers received by this user |

### Data Model: Role Enum

The system uses a Role enum to define user access levels.

| Value | Description |
|-------|-------------|
| ADMIN | Full admin access to all admin panel features |
| TRAINER | Restricted access: only Rutinas and Feriados |
| USER | Standard user (cannot access admin panel) |

### Requirement: User Role Field

The User model MUST have a `role` field of type `Role` enum with default value `USER`.

#### Scenario: User model has role field

- GIVEN the Prisma schema is configured
- WHEN the schema is parsed
- THEN User model MUST have `role Role @default(USER)`

#### Scenario: Role enum values

- GIVEN the Role enum is defined
- WHEN the schema is parsed
- THEN the enum MUST have values: `ADMIN`, `TRAINER`, `USER`

### Requirement: OwnershipTransfer Audit Table

The system MUST track all routine ownership changes in the OwnershipTransfer table.

#### Scenario: Initial routine creation logged

- GIVEN a new routine is created via `createRutina` or `createRutinaCompleta`
- THEN an OwnershipTransfer record MUST be created atomically
- AND `fromUserId` MUST be NULL (creation, not transfer)
- AND `toUserId` MUST be the routine creator

#### Scenario: Ownership transfer logged

- GIVEN `transferRutinasOwnership` is called
- THEN an OwnershipTransfer record MUST be created for each transferred routine
- AND `fromUserId` MUST be the previous owner
- AND `toUserId` MUST be the new owner

### Data Model: OwnershipTransfer

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | @id @default(uuid()) | Transfer record identifier |
| rutinaId | String | @db.Uuid, indexed | Foreign key to Rutina |
| fromUserId | String? | @db.Uuid, nullable | Previous owner (NULL for creation) |
| toUserId | String | @db.Uuid | New owner |
| createdAt | DateTime | @default(now()) | When transfer occurred |
| rutina | Rutina | @relation | Relation to routine |
| fromUser | User? | @relation("FromUser") | Relation to previous owner |
| toUser | User | @relation("ToUser") | Relation to new owner |

### Requirement: Unique Routine Names Per User

The system MUST enforce that routine names are unique per creator, not globally unique.

#### Scenario: Duplicate name by same user rejected

- GIVEN user "Nando" has a routine named "Full Body"
- WHEN another routine named "Full Body" is created for "Nando"
- THEN the creation MUST fail with unique constraint violation

#### Scenario: Same name by different user allowed

- GIVEN user "Nando" has a routine named "Full Body"
- WHEN user "Leo" creates a routine named "Full Body"
- THEN the creation MUST succeed (different creators)

### Data Model: Rutina (Extended)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | @id @default(uuid()) | Routine identifier |
| nombre | String | required | Routine name |
| creadorId | String | @db.Uuid | Foreign key to User (creator) |
| @@unique | | [creadorId, nombre] | Unique name per user |

### Requirement: Transfer to Active Users Only

The system MUST reject ownership transfers to soft-deleted users.

#### Scenario: Transfer to deleted user rejected

- GIVEN user "Nando" is soft-deleted (deletedAt is set)
- WHEN `transferRutinasOwnership` is called with `toUserId = Nando's id`
- THEN the transfer MUST be rejected with error
- AND no OwnershipTransfer record MUST be created

### Requirement: Creator Change Guard

The system MUST prevent direct `creadorId` updates outside of ownership transfer actions.

#### Scenario: Direct creadorId update blocked

- GIVEN a routine has `creadorId = Nando`
- WHEN `updateRutina` is called with a new `creadorId = Leo`
- THEN the update MUST be rejected with error
- AND the routine's `creadorId` MUST remain unchanged

#### Scenario: Transfer updates creadorId correctly

- GIVEN a routine has `creadorId = Nando`
- WHEN `transferRutinasOwnership(Nando, Leo)` is called
- THEN the routine's `creadorId` MUST be updated to Leo
- AND an OwnershipTransfer record MUST be created
