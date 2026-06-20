# Archive Report: descuento-precio-final

**Change**: `descuento-precio-final`
**Archived to**: `openspec/changes/archive/2026-06-19-descuento-precio-final/`
**Date**: 2026-06-19
**Verdict**: PARTIAL_PASS (from verify)
**Status**: 12 atomic commits + 1 transversal (a1b1990 AdminLayout fix). Static gates clean (tsc, vitest 159/159, lint 0 errors, next build green). Spec compliance 12/12. E2E gate had 2 pre-existing test issues (S2.P.2 production bug, S2.D.4 cache invalidation gotcha) — neither caused by this change.

## Lineage (Observation IDs)

| Artifact | Observation | Topic key |
|----------|--------------|-----------|
| Apply progress | #213 | `sdd/descuento-precio-final/apply-progress` |
| Cache invalidation gotcha | #215 | standalone |
| Verify (engram) | #216 | `sdd/descuento-precio-final/verify-report` |
| Project rename follow-up | #211 | `reminders/engram-mcp-cache-verify` |

## Follow-ups Tracked in ROADMAP

- `S2.P.2 edit promocion test failure (pre-existing production bug)` — §Media Prioridad
- `S2.D.4 cache invalidation test issue (descuento-precio-final E2E)` — §Baja Prioridad
- (After verify of `fix-e2e-promociones-descuentos`) `S2.D.3 delete descuento + S2.D.4 cache invalidation (SASL/Prisma 7 test env issue)` — §Baja Prioridad (consolidated entry)

## Recommendation

**MERGED** (PARTIAL_PASS). The feature is verified correct against all 12 spec scenarios. The 2 pre-existing follow-ups are documented with reproduction context.
