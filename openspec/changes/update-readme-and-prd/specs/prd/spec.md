# Delta for PRD.md Documentation

## MODIFIED Requirements

### Requirement: Phase 4 Detail - E2E Coverage Scope

Phase 4 MUST specify exactly which E2E tests are planned and their scope.

**Current state:** Phase 4 just lists "tests E2E" with no details.

**New state:** Phase 4 E2E section SHALL specify:

| Test Area | Priority | Description |
|-----------|----------|-------------|
| Public routing | High | Home page loads, routine listing, routine detail |
| Admin auth flow | High | Login success/failure, session persistence |
| CRUD operations | High | Create/edit/delete routines, days, exercises |
| PDF generation | Medium | PDF download triggers and completes |
| Search/filter | Medium | Search returns correct results |
| Theme toggle | Low | Light/dark mode persists |

**Rationale:** E2E coverage should focus on critical user paths. Admin CRUD is highest value since that's where data integrity matters most.

---

### Requirement: Phase 4 Detail - API Documentation Structure

Phase 4 MUST specify the API documentation approach.

**Current state:** Phase 4 just lists "documentación de API" with no structure.

**New state:** Phase 4 API docs section SHALL specify:

**Documentation Format:** TBD (recommend OpenAPI/Swagger or MDX-based)

**API Surface to Document:**
- All Server Actions in `src/app/actions/`
- Request/response shapes for each action
- Error codes and handling
- Auth requirements per endpoint

**Approach:** 
- Consider using `nextjs-api-docs` or hand-written MDX
- DO NOT use Swagger UI (not SSR-friendly in Next.js App Router)
- Prefer MDX-based API reference that can be deployed as a static page

---

### Requirement: Phase 4 Detail - Cache Warming Strategy

Phase 4 MUST specify the cache warming approach for SEO.

**Current state:** Phase 4 just says "cache warming para SEO" with no strategy.

**New state:** Phase 4 cache warming section SHALL specify:

**Problem:** Next.js cache may be cold after deployment or idle periods, causing slow initial page loads for SEO.

**Solution Options:**
1. **On-demand revalidation** (preferred): Use `revalidatePath` on mutations to keep pages fresh
2. **Scheduled cron job**: Call `/api/revalidate` periodically to warm cache
3. **Static generation at build**: Use `generateStaticParams` for known routine IDs

**Recommendation:** Implement option 1 (on-demand) + a lightweight cron for `/` and `/rutinas` listing pages.

**Implementation:**
- Add an API route `/api/revalidate` that calls `revalidatePath('/')` and `revalidatePath('/rutinas')`
- Set up Railway cron or Vercel cron to hit this route every 15 minutes
- Alternatively, use Vercel's `revalidate` tag-based caching

---

### Requirement: Open Issues - Address or Explicitly Defer

All Open Issues MUST be either resolved or explicitly deferred with rationale.

**Current state:** Open Issues section lists 3 items with no resolution:

```
# Open Issues

- optimización de rendimiento (lazy loading, code splitting)
- tests E2E con Playwright
- documentación de API
```

**New state:** Each issue MUST have a status:

| Issue | Status | Resolution |
|-------|--------|------------|
| Optimización de rendimiento | Deferred | Low traffic doesn't justify complexity; revisit at >10k monthly users |
| Tests E2E con Playwright | In Progress | Part of Phase 4 |
| Documentación de API | In Progress | Part of Phase 4 |

---

### Requirement: PDF Generation Library Documentation

The PRD MUST document which PDF generation library is used.

**Current state:** PDF generation is mentioned but library is not specified.

**New state:** Add a section under Consideraciones Técnicas or Stack:

```markdown
## PDF Generation

Library: **@react-pdf/renderer** (or **jsPDF** if different)

- Used for generating downloadable routine PDFs
- Renders React components to PDF
- Located in: `src/components/routines/pdf-generator.tsx` (or similar)
```

---

## ADDED Requirements

### Requirement: Future Roadmap Beyond Phase 4

The PRD SHOULD include a roadmap section outlining potential future work.

**New state:** Add "Roadmap Futura" section after Phase 4:

```markdown
## Roadmap Futura (Post-Fase 4)

### Posibles Mejoras

| Feature | Prioridad | Notas |
|---------|-----------|-------|
| Métricas de uso | Baja | Google Analytics ya está en uso |
| Exportación CSV | Baja | Para rutinas bulk |
| i18n (multi-idioma) | Baja | Solo español por ahora |
| PWA support | Baja | Offline PDF access |
| Multi-gym support | Muy Baja | Extensión futura |
```

**Rationale:** Documents long-term vision without committing to delivery.

---

### Requirement: Stack Version Consistency

All stack versions in PRD MUST match exactly what is deployed.

**Current state:** PRD already has correct versions (Next.js 16.1.6, React 19.2.3).

**Verification:** Confirm these match `package.json`:
- Next.js: `16.1.6` ✅
- React: `19.2.3` ✅
- React DOM: `19.2.3` ✅
- TypeScript: `^5` ✅
- Zustand: `^5.0.11` ✅
- Zod: `^4.3.6` ✅
- React Hook Form: `^7.71.2` ✅
- Prisma: `^7.4.2` ✅
- PostgreSQL: `18.3` ✅
- Better Auth: `^1.5.4` ✅
- Playwright: `^1.58.2` ✅

---

## REMOVED Requirements

### Requirement: Vague Phase 4 Items

The Phase 4 items listed without detail are REMOVED and REPLACED by the detailed specifications above.

**Reason:** Ambiguous items like "cache warming para SEO" provide no implementation guidance. Phase 4 MUST be actionable.
