# Tasks: Update README.md and PRD.md Documentation

## Phase 1: README.md Updates

### Header and Versioning

- [x] 1.1 **README.md** — Add version badge and last updated date after title
  - After line 1 (`# Champion Gym - Gestor de Rutinas de Gimnasio`), add: `v0.1.0 | Last updated: 2026-03-25`
  - Format: `v0.1.0 | Last updated: 2026-03-25`

### Tech Stack Version Corrections

- [x] 1.2 **README.md** — Update Tech Stack table versions (lines 9-19)
  - Change `Next.js 16` → `Next.js 16.1.6`
  - Change `React 19` → `React 19.2.3`
  - Add `React DOM 19.2.3` to the table
  - Change `Tailwind CSS 4` → `Tailwind CSS ^4`
  - Change `Zustand 5` → `Zustand ^5.0.11`
  - Change `Zod 4` → `Zod ^4.3.6`
  - Change `React Hook Form 7` → `React Hook Form ^7.71.2`
  - Change `Prisma 7` → `Prisma ^7.4.2`
  - Change `PostgreSQL 18` → `PostgreSQL 18.3`
  - Add `Better Auth ^1.5.4` to the table
  - Add `Playwright ^1.58.2` to the table

### Scripts Section Completeness

- [x] 1.3 **README.md** — Add missing scripts to "Scripts Disponibles" section (after line 173)
  - Add `npm run db:generate  # Generar cliente Prisma`
  - Add `npm run db:push      # Push schema a la base de datos`
  - Add `npm run db:studio    # Abrir Prisma Studio`

### Docker Section

- [x] 1.4 **README.md** — Add Docker instructions section after "Instalación" section (after line 147)
  - Add new section titled `## Docker (Opcional)`
  - Include commands to start PostgreSQL via docker-compose
  - Document `DATABASE_URL` format
  - Note: `postgres_data` volume for persistence

### Deployment Section

- [x] 1.5 **README.md** — Add Deployment section after Docker section
  - Document Vercel deployment (recommended for Next.js)
  - Document Railway deployment (alternative)
  - List required environment variables: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`

### Troubleshooting/FAQ Section

- [x] 1.6 **README.md** — Add Troubleshooting/FAQ section
  - Add FAQ entry: Prisma client out of sync → run `npm run db:generate`
  - Add FAQ entry: Database connection errors → verify `DATABASE_URL` and Docker status
  - Add FAQ entry: Auth issues → check `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`

### Contribution Guidelines Reference

- [x] 1.7 **README.md** — Add contribution guidelines note
  - Add reference to CONTRIBUTING.md or inline contribution instructions
  - Location: before or after "Licencia" section

### License SPDX Identifier

- [x] 1.8 **README.md** — Change license from "Privado - Champion Gym" to SPDX identifier
  - Change line 241 from `Privado - Champion Gym` to `UNLICENSED` (proprietary project)
  - Rationale: "Privado" is not a valid SPDX identifier

---

## Phase 2: PRD.md Updates

### Phase 4 E2E Scope Detail

- [x] 2.1 **openspec/PRD.md** — Detail Phase 4 E2E test scope with table (replace line 550)
  - Add table with: Public routing (High), Admin auth flow (High), CRUD operations (High), PDF generation (Medium), Search/filter (Medium), Theme toggle (Low)
  - Replace vague "tests E2E" with specific test areas

### Phase 4 API Documentation Structure

- [x] 2.2 **openspec/PRD.md** — Detail API documentation approach in Phase 4 section
  - Document using MDX-based approach (not Swagger UI)
  - List API surface: Server Actions in `src/app/actions/`
  - Note: Document request/response shapes, error codes, auth requirements

### Phase 4 Cache Warming Strategy

- [x] 2.3 **openspec/PRD.md** — Detail cache warming strategy for SEO
  - Document on-demand revalidation using `revalidatePath`
  - Mention scheduled cron option for `/` and `/rutinas` pages
  - Note: Recommend on-demand + lightweight cron hybrid approach

### Open Issues Resolution

- [x] 2.4 **openspec/PRD.md** — Address or explicitly defer all Open Issues (lines 518-522)
  - Add status table with columns: Issue, Status, Resolution
  - optimización de rendimiento → Deferred (low traffic justification)
  - tests E2E con Playwright → In Progress (Phase 4)
  - documentación de API → In Progress (Phase 4)

### Future Roadmap Section

- [x] 2.5 **openspec/PRD.md** — Add "Roadmap Futura" section after Phase 4
  - Add table with potential future features: Métricas de uso, Exportación CSV, i18n, PWA support, Multi-gym support
  - Include priority column (Baja, Muy Baja)

### Stack Version Verification

- [x] 2.6 **openspec/PRD.md** — Verify all stack versions match package.json (lines 410-441)
  - Confirm: Next.js 16.1.6, React 19.2.3, React DOM 19.2.3, TypeScript ^5, Zustand ^5.0.11, Zod ^4.3.6, React Hook Form ^7.71.2, Prisma ^7.4.2, PostgreSQL 18.3, Better Auth ^1.5.4, Playwright ^1.58.2
  - If versions differ, update to match exactly

---

## Implementation Order

1. **README.md header** (1.1) — Simple text addition, no dependencies
2. **README.md stack versions** (1.2) — Table update, straightforward
3. **README.md scripts** (1.3) — List addition, follows existing pattern
4. **README.md Docker** (1.4) — New section, independent
5. **README.md Deployment** (1.5) — New section, independent
6. **README.md FAQ** (1.6) — New section, independent
7. **README.md Contrib** (1.7) — Simple reference addition
8. **README.md License** (1.8) — One-line change
9. **PRD Phase 4 detail** (2.1-2.3) — Replace vague items with detailed specs
10. **PRD Open Issues** (2.4) — Status table addition
11. **PRD Roadmap** (2.5) — New section
12. **PRD version verify** (2.6) — Verification task, may be no-op

---

## Files Modified

| File | Tasks |
|------|-------|
| `README.md` | 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8 |
| `openspec/PRD.md` | 2.1, 2.2, 2.3, 2.4, 2.5, 2.6 |

---

## Verification Checklist

After implementation, verify:
- [ ] README renders version badge correctly
- [ ] All version numbers in README.tech stack match package.json exactly
- [ ] All scripts in README match package.json scripts section
- [ ] Docker section includes correct postgres:18.3 image and credentials
- [ ] Deployment section mentions both Vercel and Railway
- [ ] FAQ addresses Prisma sync, DB connection, and auth issues
- [ ] License changed from "Privado - Champion Gym" to SPDX format
- [ ] PRD Phase 4 now has detailed E2E table, API docs approach, cache strategy
- [ ] PRD Open Issues have explicit status and resolution
- [ ] PRD includes future roadmap section
- [ ] PRD stack versions verified against package.json
