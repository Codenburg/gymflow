# Changelog

Todas las versiones notables de este proyecto. El formato sigue [Keep a Changelog](https://keepachangelog.com/).

## [1.0.0] - 2026-06-15

🎉 **Primer release 1.0**. Sistema de gestión de rutinas de gimnasio completo y production-ready.

### Features shipped (rolled up across 0.19.0 → 0.20.0 → 0.20.1)

- **Next.js 16 Cache Components migration** (v0.19.0): `cacheComponents: true` habilitado, 11 readers migrados a `'use cache'` + `cacheTag` + `cacheLife`, 7 `force-dynamic` flags removidos.
- **Strict TypeScript build** (v0.20.0): 14 pre-existing TS errors resueltos, `ignoreBuildErrors: true` removido de `next.config.ts`. Build ahora es estricto.
- **Gimnasio configurable** (v0.20.0): nombre, horarios estructurados (Lun a Dom con formato `horarioJson`), dirección, redes sociales, precio de inscripción.
- **GGA pre-commit hook** (v0.20.1, Recomendación 4): diff-only review wrapper + `.gga-ignore` escape hatch + `GGA_DIFF_FILTER=off` kill switch. Opt-in via `bash scripts/install-gga-hook.sh`.
- **E2E coverage for critical flows** (v0.20.1, Recomendación 3): 26+ nuevos test cases (rutinas, feriados, promociones, descuentos, trainers, auth) con page objects, fixtures, helpers. 5.2.3 isolation fix + `retries: 1` + `test:fast` script.
- **Tech debt cleanup** (v0.20.1): 5 GGA follow-ups resueltos (FOLLOWUP-1 Promise.all, FOLLOWUP-2 revalidateTag casts, FOLLOWUP-7 Prisma migration doc, FOLLOWUP-13 return-type, FOLLOWUP-3 Decimal serialization). 3 pre-existing TS errors resueltos. 3 page-object dead locators removidos.

### Quality

- **0 TS errors** (strict build, sin `ignoreBuildErrors`)
- **151/151 unit tests** passing (Vitest)
- **245 Playwright tests** listed across 18 spec files (full E2E run deferred to CI per GGA-FOLLOWUP-5)
- **0 `as any` casts** en cache invalidation calls (FOLLOWUP-2)

### SDD (Spec-Driven Development)

Todos los cambios de 0.19.0 → 1.0.0 pasaron por SDD cycle formal (proposal → design → tasks → apply con stacked-to-main chained PRs → verify → archive). 2 SDD cycles archivados en `openspec/changes/archive/`:
- `2026-03-16-fix-admin-auth-bugs` (y previos)
- `2026-06-13-gga-hook-diff-only` (Recomendación 4)
- `2026-06-13-e2e-coverage-critical-flows` (Recomendación 3)

### Notas

- El proyecto usa `prisma db push` en vez de `prisma migrate dev` (shadow database limitation). Ver `CONTRIBUTING.md` §"Workflow de migraciones".
- El GGA pre-commit hook es opt-in — cada developer corre `bash scripts/install-gga-hook.sh` una vez por fresh clone.
- El full Playwright E2E run no se ejecutó en el environment de desarrollo (dev server cold cache, renders 109s+). CI/dev debe validar los 26 nuevos test cases end-to-end. Ver `openspec/changes/archive/2026-06-13-e2e-coverage-critical-flows/verify-report.md` para detalles.

---

## [0.20.1] - 2026-06-13

Ver detalles arriba. Este release fue un batch de 4 PRs stacked-to-main (E2E coverage cycle) + tech debt cleanup batch.

## [0.20.0] - 2026-06-12

- **Strict TypeScript build** (Recomendación 2): 14 TS errors resueltos, `ignoreBuildErrors` removido.

## [0.19.0] - 2026-06-11

- **Next.js 16 Cache Components** (Recomendación 1): migration a `'use cache'` + `cacheTag` + `cacheLife`. 11 readers, 7 force-dynamic removidos.
