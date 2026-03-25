# Delta for README.md Documentation

## MODIFIED Requirements

### Requirement: Version and Metadata Header

The README.md MUST display a version number and last updated date immediately after the title.

**Current state:** Title `# Champion Gym - Gestor de Rutinas de Gimnasio` has no version info.

**New state:** Header section SHALL include:
- Version number matching `package.json` version field (`0.1.0`)
- Last updated date in ISO format (YYYY-MM-DD)

#### Scenario: Version display

- GIVEN a user views the README.md
- WHEN the document is rendered
- THEN the top of the document shows `v0.1.0 | Last updated: 2026-03-25` or similar

---

### Requirement: Precise Stack Versions

The Tech Stack table MUST list exact versions matching `package.json`.

**Current state:**
- `Next.js 16` → MUST be `Next.js 16.1.6`
- `React 19` → MUST be `React 19.2.3`

**New state:** All version references in README SHALL match the installed dependencies exactly.

| Dependency | Current README | Correct Version |
|------------|---------------|-----------------|
| Next.js | 16 | 16.1.6 |
| React | 19 | 19.2.3 |
| React DOM | (not listed) | 19.2.3 |
| TypeScript | 5 | ^5 (leave as-is) |
| Tailwind CSS | 4 | ^4 |
| Zustand | 5 | ^5.0.11 |
| Zod | 4 | ^4.3.6 |
| React Hook Form | 7 | ^7.71.2 |
| Prisma | 7 | ^7.4.2 |
| PostgreSQL | 18 | 18.3 |
| Better Auth | (not listed) | 1.5.4 |
| Playwright | (not listed) | ^1.58.2 |

---

### Requirement: Complete Scripts List

The Scripts Disponibles section MUST list ALL npm scripts from `package.json`.

**Current state:** Missing scripts:
- `db:generate` (Prisma client generation)
- `db:push` (Push schema to database)
- `db:studio` (Prisma Studio)
- `postinstall` (runs `prisma generate`)

**New state:** Scripts section SHALL include:

```bash
npm run dev          # Dev server en puerto 3000
npm run build        # Build de producción (incluye prisma generate)
npm run start        # Iniciar producción
npm run lint         # ESLint
npm run test         # Playwright tests
npm run test:ui      # Playwright con UI
npm run db:seed      # Seed de datos
npm run db:generate  # Generar cliente Prisma
npm run db:push      # Push schema a la base de datos
npm run db:studio    # Abrir Prisma Studio
```

---

### Requirement: Docker Instructions

The README MUST include Docker instructions for running PostgreSQL via docker-compose.yml.

**Current state:** No Docker section exists.

**New state:** README SHALL include a Docker section after Instalación with:

```markdown
## Docker (Opcional)

Si prefieres usar Docker para PostgreSQL:

```bash
# Iniciar PostgreSQL en Docker
docker-compose up -d

# La DATABASE_URL debe ser:
DATABASE_URL="postgresql://gym_user:gym_password@localhost:5432/gym_routines"
```

The docker-compose.yml file uses:
- Image: `postgres:18.3`
- Port: `5432`
- Default credentials: `gym_user` / `gym_password`
- Database: `gym_routines`

---

### Requirement: Deployment Section

The README MUST include a Deployment section documenting Vercel and Railway deployment.

**Current state:** No deployment section exists.

**New state:** README SHALL include a Deployment section with:

- **Vercel:** Recommended for Next.js deployments. Connect repo, set environment variables.
- **Railway:** Alternative. Set `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.

---

### Requirement: Troubleshooting/FAQ Section

The README MUST include a troubleshooting section addressing common issues.

**Current state:** No FAQ/troubleshooting section.

**New state:** README SHALL include a FAQ section addressing:
- Prisma client out of sync after dependency updates → run `npm run db:generate`
- Database connection errors → verify `DATABASE_URL` and Docker container status
- Auth issues → check `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`

---

### Requirement: Contribution Guidelines Note

The README MUST include a reference to contribution guidelines.

**Current state:** No contribution guidelines mention.

**New state:** README SHALL include a section or note pointing to contribution guidelines (e.g., "See CONTRIBUTING.md for guidelines" or inline basic contribution instructions).

---

### Requirement: License SPDX Identifier

The license field MUST use a proper SPDX license identifier.

**Current state:** `Licencia: Privado - Champion Gym`

**New state:** SHALL be one of:
- `"UNLICENSED"` - if proprietary/closed source
- `"MIT"` - if MIT license
- Other valid SPDX identifier

**Rationale:** "Privado" is not a valid SPDX identifier. If this is a proprietary project, use `UNLICENSED`.

---

## ADDED Requirements

### Requirement: Docker Volume Persistence

The Docker instructions MUST clarify data persistence behavior.

- GIVEN a user runs `docker-compose up -d`
- WHEN the PostgreSQL container starts
- THEN data persists in the `postgres_data` Docker volume
- AND data survives container restarts

### Requirement: Environment Variable Checklist

The README SHOULD provide a clear checklist of required environment variables.

- GIVEN a user sets up the project
- WHEN they create `.env` from `.env.example`
- THEN they MUST set:
  - `DATABASE_URL` (required)
  - `BETTER_AUTH_SECRET` (required, 32+ chars)
  - `BETTER_AUTH_URL` (required, production URL)
