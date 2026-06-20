# Archive Report: fix-e2e-promociones-descuentos

**Change**: `fix-e2e-promociones-descuentos`
**Archived to**: `openspec/changes/archive/2026-06-19-fix-e2e-promociones-descuentos/`
**Date**: 2026-06-19
**Verdict**: PARTIAL_PASS (from verify-report.md)
**Status**: 7 atomic commits. Static gates clean (tsc, lint 0 errors). E2E validated partially: 3/5 target tests pass (S2.P.1 ✅, S2.P.3 ✅, S2.D.1 ✅). 2 follow-ups documented in ROADMAP with full reproduction context.

## Lineage (Observation IDs)

| Artifact | Observation | Topic key |
|----------|--------------|-----------|
| Apply progress | #220 | `sdd/fix-e2e-promociones-descuentos/apply-progress` |
| Project rename | #209 | `context/project-rename` (sister, predates this change) |
| Multiple-choice preference | #212 | `preference/multiple-choice-questions` (used throughout) |

## Confirmed Passes (3/5)

- **S2.P.1** create promocion — pre-existing passing, no regression.
- **S2.P.3** delete promocion — clickConfirmDelete fix works.
- **S2.D.1** create descuento — randomMeses + reset utility work (after Prisma 7 fix in `e38d13e`).

## Follow-ups Tracked in ROADMAP

- `S2.P.2 edit promocion test failure (pre-existing production bug)` — §Media Prioridad. Detailed context: which test changes were applied, which hypotheses were tested, what production fix to apply (form/manager race).
- `S2.D.3 delete descuento + S2.D.4 cache invalidation (SASL/Prisma 7 test env issue)` — §Baja Prioridad. Detailed context: what works, what fails, the SASL root cause, the steps to fix (load .env in test process + apply Prisma 7 fix to `gym-reset.ts`).

## Product Feature Shipped

**MESES_OPTIONS expansion to all 12 months** (`feat(admin): expand MESES_OPTIONS to all 12 months — give gyms more pricing flexibility` — `dc3474f`). Tracked in ROADMAP §"Expandir MESES_OPTIONS a todos los meses" as a post-1.0 feature. Now needs to be moved to ✅ Completado (or kept in post-1.0 with "implemented" status).

## Recommendation

**ARCHIVED with PARTIAL_PASS.** The 3 confirmed passes are real value. The 2 follow-ups are properly documented for the next person. The MESES_OPTIONS expansion is a real product feature that improves the admin's pricing flexibility.
