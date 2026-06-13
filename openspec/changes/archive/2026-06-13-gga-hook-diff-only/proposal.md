# Proposal: GGA pre-commit hook — diff-only review + escape hatch

## Intent

`gga run` (pre-commit hook) reviews the **whole staged file** via `git show :file`, not the diff. Causes false positives on pre-existing code — 8+ of 13 recent commits used `--no-verify`. A misfiring gate trains the team to bypass it. **Goal**: flag only lines the author changed, with a `.gga-ignore` escape hatch; clean up well-bounded pre-existing issues the hook over-flags.

## Scope

**In scope**
- `scripts/gga-pre-commit.mjs` (~120 LOC, Node stdlib) replacing the 6-line bash stub: `git diff --cached` + `gga run` + post-filter to changed lines only.
- `.gga-ignore` seed (14 entries); `scripts/install-gga-hook.sh`; `tests/gga-diff-filter.test.ts` (Vitest ≥8 cases).
- Pre-existing cleanups (≤30 LOC): #9 `revalidatePath` path fix; #14 `GYM_SINGLETON_ID` (4 sites); #11 `findFirst` into try/catch; #12 3× `formData.get("id")` null-guard; `CONTRIBUTING.md` update.

**Out of scope**: #1, #2, #4, #5, #7, #8, #10, #13.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
None.

> **Rationale**: developer tooling — no runtime/product behavior change. Analogous to `.eslintrc` or `vitest.config.ts`.

## Approach

**Hybrid: diff-only post-filter (primary) + `.gga-ignore` (escape hatch).**

GGA v2.8.1's `--diff-only` is **locked to `--pr-mode`** (`~/.local/share/gga/lib/pr_mode.sh:168-169`); pre-commit always reads the full file.

1. **Wrapper + post-filter** (chosen): invoke `gga run`, intercept findings, drop any whose lines aren't in the changed-line set. Zero GGA changes; small + testable.
2. **`.gga-ignore` only** (rejected): static list doesn't scale.
3. **PR-mode** (rejected): `gga run --pr-mode --diff-only` against `dev` — too coarse.

## Affected Areas

- **New**: `scripts/{gga-pre-commit.mjs, install-gga-hook.sh, gga-ignore-helper.mjs}`; `tests/gga-diff-filter.test.ts`; `.gga-ignore`; `src/lib/gym-constants.ts`.
- **Modified**: `actions/descuentos-duracion.ts:100,146,177`; `actions/{promociones,descuentos-duracion,feriados}.ts` (4× `gymId`); `actions/feriados.ts:75-82, 110, 155-163, 189, 245`; `CONTRIBUTING.md`.
- **Local**: `.git/hooks/pre-commit` replaced by wrapper (untracked).

**Diff**: ~250 added, ~25 removed. **Under 500-line budget**.

## Risks

- **R1** Wrapper lets real issues through. *Low.* `GGA_DIFF_FILTER=off` env var restores old behavior; old hook kept as `.pre-commit.bak` 1 week.
- **R2** Diff-only misses cross-line issues. *Med.* Wrapper reports suppressed count; `.gga-ignore` is per-line; `STRICT_MODE=true` still applies.
- **R3** `feriados.ts` cleanup regresses error semantics. *Low.* TDD + revertible commits; E2E covers badge.

## Rollback Plan

- **Wrapper** (5 min): `git revert <wrapper-commit>` + `gga install`; delete `.gga-ignore`.
- **Per cleanup**: `git revert <sha>` restores original.
- **Worst case**: `git commit --no-verify`; document in msg.
- **Fallback**: `gga run --pr-mode --diff-only` against `dev`.

## Dependencies

- GGA v2.8.1 (already at `~/.local/bin/gga`).
- Node.js stdlib — no new deps.

## Success Criteria

- [ ] Wrapper installed; `chmod +x` verified.
- [ ] Next 5 commits touching pre-existing lines → **0 false positives** for unchanged lines.
- [ ] `GGA_DIFF_FILTER=off` restores old behavior; `.gga-ignore` parses.
- [ ] Vitest ≥8 cases pass; 4 cleanups merged with green E2E + unit; `tsc --noEmit` + `lint` clean in changed files; hook **<3s wall time**; `CONTRIBUTING.md` updated.
