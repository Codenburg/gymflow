# Design: GGA pre-commit hook — diff-only review + escape hatch

> Change: `gga-hook-diff-only`
> Proposal: `openspec/changes/gga-hook-diff-only/proposal.md`
> Stack: Next.js 16.1.6 + Node.js (ESM) + Vitest 4

## Technical Approach

GGA v2.8.1's `--diff-only` flag is **locked to `--pr-mode`** (`~/.local/share/gga/lib/pr_mode.sh:168-169`), so the pre-commit code path always reads the full staged file via `git show :file`. We cannot fix this inside GGA — we add a thin Node wrapper that (a) computes the changed-line set from `git diff --cached`, (b) invokes `gga run` synchronously, (c) post-filters the AI's findings to keep only those on changed lines, and (d) applies the `.gga-ignore` escape hatch on top. The wrapper is a single-file ESM module plus one pure parser; no new dependencies.

The wrapper preserves GGA's verdict (exit 1 on FAILED) and only intervenes in the FAILED path. This minimizes the trust shift: when GGA passes, the wrapper is a no-op; when GGA fails, the wrapper suppresses findings that are not on the lines the author touched.

## Architecture Decisions

### Decision 1: Three-file split (wrapper + two parsers)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Single 120-LOC file | Less ceremony; harder to test the parser in isolation | ❌ |
| **Wrapper + `gga-ignore-helper.mjs` + `gga-output-parser.mjs`** | Pure parsers are Vitest-friendly; wrapper is thin orchestration | ✅ |
| One parser module for both | Mixed responsibilities | ❌ |

The two parsers export pure functions with no I/O. The wrapper handles all process / subprocess / IO concerns. Each parser is ≤ 80 LOC.

### Decision 2: Fail-OPEN on GGA runtime error and parse failure

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Fail-CLOSED (preserve GGA exit code) | Trains the team to use `--no-verify` again — the exact behavior the proposal is fixing | ❌ |
| **Fail-OPEN with raw GGA output surfaced to stderr** | Devs see what GGA flagged; commit goes through; reviewable post-hoc | ✅ |

Rationale: the entire premise of this change is that the gate has been over-firing. A network blip or AI model hiccup that blocks commits is the same class of failure as a false positive. We print GGA's raw output to stderr and a `WARN:` line. `GGA_DIFF_FILTER=off` (kill switch) remains available for full restoration.

### Decision 3: Permissive multi-regex parser for GGA's AI output

GGA's prompt template (`/home/titanium/.local/bin/gga:1116-1177`) does NOT enforce a strict format. Different AI providers phrase findings differently:

```
- path/to/file.ts:42 - rule: foo - description
**File**: path/to/file.ts\n**Line**: 42\n**Rule**: foo
1. path/to/file.ts:42 — description
path/to/file.ts line 42: description
```

The parser tries five regex patterns in priority order, disambiguates against the staged-file set, and falls back to "keep as non-localizable" (preserves GGA's verdict). See `parseGgaOutput` interface below.

### Decision 4: Edge case policy table

| Case | Behavior | Rationale |
|------|----------|-----------|
| Empty diff (`git commit --allow-empty` or no relevant files) | Exit 0 silently, skip `gga run` entirely | Avoids paying AI cost for an empty commit |
| `gga run` exits 0 (PASSED) | Exit 0, no parsing | Fast path — wrapper is a no-op |
| `gga run` exits 1 + parse succeeds | Filter findings → exit 1 if any survive, else exit 0 | Core diff-only behavior |
| `gga run` exits 1 + parse fails | **Fail-OPEN**: print raw GGA output to stderr + WARN line, exit 0 | Don't gate on opaque output |
| `gga run` exits non-zero due to runtime (network, API key, timeout) | **Fail-OPEN** with stderr warning | Same as parse failure — the gate shouldn't be a hard wall |
| Binary / renamed / deleted files in diff | Skip silently (already excluded by GGA's `get_staged_files`) | Out of scope for the wrapper |
| `.gga-ignore` syntax error | **Fail-CLOSED** with a clear error pointing at the bad line | Silently ignoring the file is worse than blocking — devs must fix it |
| `GGA_DIFF_FILTER=off` env var | Pass-through: print all GGA findings verbatim, exit with GGA's code | Escape hatch for full restoration |
| `.gga-ignore` missing | Proceed with empty ignore set (file is optional) | Default is "diff-only, no ignores" |

### Decision 5: Install script targets `.git/hooks/pre-commit` (not Husky)

The repo has no `.husky/` directory; the existing 6-line bash stub lives at `.git/hooks/pre-commit`. The new `scripts/install-gga-hook.sh` writes the same path, backs up the existing hook to `.git/hooks/pre-commit.bak` (untracked), and replaces it with a one-liner that calls `node scripts/gga-pre-commit.mjs`. Idempotent: re-running detects the marker comment and no-ops.

## Data Flow

```
git commit -m "..."
       │
       ▼
.git/hooks/pre-commit
       │  (one-liner)
       ▼
node scripts/gga-pre-commit.mjs
       │
       │  1. read .gga-ignore              ──── scripts/gga-ignore-helper.mjs
       │  2. git diff --cached (unified=0) ──── Map<file, Set<line>>
       │  3. if diff empty → exit 0
       │  4. spawnSync('gga', ['run'])     ──── { stdout, stderr, status }
       │  5. if status === 0 → exit 0
       │  6. parseGgaOutput(stdout)        ──── scripts/gga-output-parser.mjs
       │  7. for each finding:
       │       - drop if line not in changed-set
       │       - drop if (file, line) in ignore-set
       │  8. print surviving findings (GGA-style)
       │  9. print summary: "N on changed lines; M suppressed"
       │ 10. exit 1 if N > 0, else exit 0
       ▼
   exit 0 | 1
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `scripts/gga-pre-commit.mjs` | Create | The wrapper. ~120 LOC, Node stdlib only (`child_process`, `fs`, `path`). |
| `scripts/gga-ignore-helper.mjs` | Create | Pure parser: `parseGgaIgnore(text: string): IgnoreSet`. ~40 LOC. |
| `scripts/gga-output-parser.mjs` | Create | Pure parser: `parseGgaOutput(stdout: string, knownFiles: Set<string>): Finding[]`. ~80 LOC. |
| `scripts/install-gga-hook.sh` | Create | Backs up `.git/hooks/pre-commit` → `.bak`; writes one-liner. Idempotent. |
| `scripts/uninstall-gga-hook.sh` | Create | Restores `.bak` if present, else removes the wrapper. |
| `tests/gga-diff-filter.test.ts` | Create | Vitest suite for the two parsers and the filter function. ≥ 8 cases (see below). |
| `.gga-ignore` | Create | Seeded with 14 entries (one per known GGA over-flag site from the proposal). |
| `src/lib/gym-constants.ts` | Create | Exports `GYM_SINGLETON_ID = "gym"`. ~5 LOC. |
| `src/app/actions/promociones.ts` | Modify | Line 105: `gymId: "gym"` → `gymId: GYM_SINGLETON_ID`. +1 import. |
| `src/app/actions/descuentos-duracion.ts` | Modify | Line 91: gymId. Lines 100, 146, 177: `revalidatePath("/admin/descuentos")` → `/admin/descuentos-duracion`. +1 import. |
| `src/app/actions/feriados.ts` | Modify | Lines 81, 190: gymId. Lines 79-84 and 188-194: wrap `findFirst` in try/catch. Lines 150, 263: null-guard `formData.get("id")` (also line 189 in `updateFeriado` for the post-parse findFirst path; the proposal says 3 sites — confirm in apply). +1 import. |
| `CONTRIBUTING.md` | Modify | New section: "Pre-commit hook (GGA + diff-only filter)" with `.gga-ignore` syntax and the `GGA_DIFF_FILTER=off` kill switch. |
| `package.json` | Modify | Bump `version` 0.20.0 → 0.20.1 (patch — developer tooling). |
| `.git/hooks/pre-commit` | Local (untracked) | Replaced by `install-gga-hook.sh`. Not committed. |

## Interfaces / Contracts

### `scripts/gga-ignore-helper.mjs`

```js
// @typedef {{ fileGlob: string, line: number | null, range: [number, number] | null }} IgnoreEntry
//   - line=null and range=null → match whole file
//
// @typedef {{ entries: IgnoreEntry[], raw: string }} IgnoreSet
//
// @param {string} text — raw .gga-ignore file content
// @returns {IgnoreSet}
// @throws {Error} with line number and offending line on syntax error

export function parseGgaIgnore(text) { /* ... */ }

// @param {IgnoreSet} set
// @param {string} file — repo-relative path
// @param {number} line — 1-indexed
// @returns {boolean}
export function isIgnored(set, file, line) { /* ... */ }
```

**Syntax**:
- `# comment` — comment line
- blank line — ignored
- `path/to/file.ts` — whole file
- `path/to/file.ts:42` — single line (1-indexed)
- `path/to/file.ts:42-50` — inclusive range
- `glob/*.ts` — simple glob (only `*` and `**` supported; no `?` or `[abc]`)

**Seed (14 entries)** — exact content of `.gga-ignore`:

```
# gym-routines-manager .gga-ignore — diff-only post-filter
# See CONTRIBUTING.md for syntax.

# Pre-existing code flagged by GGA v2.8.1 — suppress on changed-only path.
# Re-evaluate on every minor release.

# Cleanups scheduled for this change (will become obsolete)
src/app/actions/promociones.ts:105
src/app/actions/descuentos-duracion.ts:91
src/app/actions/descuentos-duracion.ts:100
src/app/actions/descuentos-duracion.ts:146
src/app/actions/descuentos-duracion.ts:177
src/app/actions/feriados.ts:81
src/app/actions/feriados.ts:150
src/app/actions/feriados.ts:190
src/app/actions/feriados.ts:263

# Pre-existing noise (history) — keep ignored until next sweep
src/lib/rutinas.ts:*
tests/check-*.ts
```

### `scripts/gga-output-parser.mjs`

```js
// @typedef {{
//   file: string,
//   line: number | null,    // null = file-level finding
//   severity: 'error' | 'warning' | 'info',
//   message: string,
//   rule?: string
// }} Finding
//
// @param {string} stdout — gga run output
// @param {Set<string>} knownFiles — set of staged file paths
// @returns {Finding[]}

export function parseGgaOutput(stdout, knownFiles) { /* ... */ }
```

**Parser strategy** (priority order — first match wins per line):

1. `^(?<file>\S+\.\w+):(?<line>\d+)(?::(?<col>\d+))?[:\s-]+(?<msg>.+)$`
2. `^\*\*File\*\*:\s*(?<file>\S+)\s*\n\*\*Line\*\*:\s*(?<line>\d+)\s*\n(?:\*\*Rule\*\*:\s*(?<rule>.+)\s*\n)?\*\*Description\*\*:\s*(?<msg>.+)$` (multiline)
3. `^[-*]\s+(?<file>\S+\.\w+):(?<line>\d+)\s+[-—]\s+(?<msg>.+)$`
4. `^(?<file>\S+\.\w+)\s+line\s+(?<line>\d+)[:\s-]+(?<msg>.+)$`
5. `^(?<file>\S+\.\w+)\s*[:|-]\s*(?<msg>.+)$` (line=null, file-level)

If `file` from a regex is not in `knownFiles`, the line is treated as a non-localizable file-level finding (line=null, file = basename) and PRESERVED through the filter (GGA's verdict stands). Severity is inferred from message keywords: `error|critical|fail` → error, `warn` → warning, else info.

### `scripts/gga-pre-commit.mjs` (skeleton)

```js
#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { parseGgaIgnore, isIgnored } from './gga-ignore-helper.mjs'
import { parseGgaOutput } from './gga-output-parser.mjs'

const REPO = process.cwd()
const KILL_SWITCH = process.env.GGA_DIFF_FILTER === 'off'
const IGNORE_PATH = join(REPO, '.gga-ignore')

// 1. Read ignore
let ignore = { entries: [], raw: '' }
if (existsSync(IGNORE_PATH)) {
  ignore = parseGgaIgnore(readFileSync(IGNORE_PATH, 'utf8'))
}

// 2. Changed lines
const diffOut = spawnSync('git', ['diff', '--cached', '--unified=0', '--no-color'], { encoding: 'utf8' })
const changedLines = parseDiffForLines(diffOut.stdout)
const stagedFiles = new Set(
  spawnSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMRT'], { encoding: 'utf8' })
    .stdout.trim().split('\n').filter(Boolean)
)

if (stagedFiles.size === 0) process.exit(0) // empty commit

// 3. Run GGA
const gga = spawnSync('gga', ['run'], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
if (gga.status === 0) process.exit(0)

// 4. Parse
let findings
try {
  findings = parseGgaOutput(gga.stdout, stagedFiles)
} catch (err) {
  // Fail-OPEN: surface raw output, don't block
  process.stderr.write(`[gga-pre-commit] WARN: failed to parse GGA output (${err.message})\n`)
  process.stderr.write(gga.stdout)
  if (KILL_SWITCH) process.exit(gga.status ?? 1)
  process.exit(0)
}

// 5. Filter
const surviving = findings.filter(f => {
  if (KILL_SWITCH) return true
  if (f.line !== null && !changedLines.get(f.file)?.has(f.line)) return false
  if (isIgnored(ignore, f.file, f.line ?? -1)) return false
  return true
})

// 6. Report
if (surviving.length > 0) {
  for (const f of surviving) {
    const where = f.line ? `${f.file}:${f.line}` : f.file
    process.stderr.write(`  ${f.severity.toUpperCase()}: ${where} ${f.message}${f.rule ? ` (${f.rule})` : ''}\n`)
  }
}
const suppressed = findings.length - surviving.length
process.stderr.write(`\n[gga-pre-commit] ${surviving.length} finding(s) on changed lines; ${suppressed} suppressed (unchanged or ignored)\n`)
process.exit(surviving.length > 0 ? 1 : 0)
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (Vitest) | `parseGgaIgnore` — 6 cases; `parseGgaOutput` — 5 cases; combined filter — ≥ 8 cases (see below) | `tests/gga-diff-filter.test.ts`, jsdom env. Pure functions; no git/gga subprocess. |
| Integration (manual, smoke) | End-to-end wrapper run on a known staged file | Run `node scripts/gga-pre-commit.mjs` after a `git add` of a clean file. Expect exit 0. Skip in CI. |
| E2E (Playwright) | Existing `feriados-badge-e2e.spec.ts` and `feriados-badge-api.spec.ts` must remain green after the `feriados.ts` cleanups | Run `pnpm test` after cleanups land. |

### Required Vitest cases (≥ 8, in `tests/gga-diff-filter.test.ts`)

1. Changed line + GGA finding → **survives** the filter
2. Unchanged line + GGA finding → **suppressed**
3. `.gga-ignore` line entry matches → **suppressed**
4. `.gga-ignore` whole-file pattern matches → **all findings in that file suppressed**
5. `.gga-ignore` malformed (e.g. `:42-` bad range) → `parseGgaIgnore` throws with line number
6. Empty changed-line set → **all line-localized findings suppressed**; file-level survive
7. `parseGgaOutput` on a 5-pattern corpus (one per regex variant) → each yields the expected `Finding` shape
8. GGA runtime error simulated (mocked stdout with `STATUS: FAILED` + non-conforming text) → `parseGgaOutput` returns non-localizable findings → wrapper exits 1 with GGA's verdict preserved (file-level)
9. `GGA_DIFF_FILTER=off` env var → wrapper passes through (test by directly invoking the filter function with the kill switch, asserting no suppression)
10. Binary / renamed file paths filtered out by `get_staged_files` → never enter the parser

The test file uses Node's `import` syntax (ESM); vitest.config already has `globals: true` and `setupFiles: ['./tests/setup.ts']`. Tests live in `tests/`, not `tests/unit/`, to match the existing pattern (`formato-helpers.test.ts`).

## Migration / Rollout

No data migration. Rollout sequence:

1. Land the parsers + Vitest suite (red → green).
2. Land the wrapper + install script.
3. Run `bash scripts/install-gga-hook.sh` ONCE on the dev workstation that merges this change.
4. Land the 4 cleanups (small commits; each is revertible per `work-unit-commits`).
5. Land `.gga-ignore` (its 14 entries reference the cleanup lines — apply after cleanups so the line numbers are stable).
6. Land `CONTRIBUTING.md` update + `package.json` bump to 0.20.1.

Rollback (per proposal): `git revert` per cleanup; or `git revert <wrapper-commit> && gga install` for the full wrapper.

## Risks (technical-level)

- **R1 — Wrapper fails open on parse failure → real issues slip through.** *Med.* Mitigation: explicit `GGA_DIFF_FILTER=off` kill switch + the suppression count is printed so devs can see what was filtered. If parse fails more than 1× in a row, devs will notice.
- **R2 — Diff-only misses cross-line issues** (e.g. an unused import flagged by GGA on a line added in a previous commit). *Med.* Mitigation: report the suppressed count; `.gga-ignore` is per-line; `STRICT_MODE=true` (the project default) still applies for unrelated failures.
- **R3 — GGA output format drifts in future versions** → parser breaks. *Low.* Mitigation: the parser is permissive (5 regexes + file-set disambiguator). `CONTRIBUTING.md` will pin GGA v2.8.1 in the install instructions.
- **R4 — `feriados.ts` cleanup regresses error semantics** (admin CRUD + badge notification). *Med.* Mitigation: the cleanup is split into 3 atomic commits; the existing E2E `feriados-badge-e2e.spec.ts` and `feriados-badge-api.spec.ts` must stay green. `findFirst` wrap is local to the duplicate-pre-check block and does not change the success path.
- **R5 — Wrapper is added but install is never run** → the gate never activates. *Med.* Mitigation: the release commit runs `bash scripts/install-gga-hook.sh` as a one-time setup on the release machine. `CONTRIBUTING.md` documents the manual step for future fresh clones.

## Open Questions

- [ ] `feriados.ts:189` is referenced in the proposal as a third `formData.get("id")` site — the actual file shows three `formData.get("id") as string` casts at lines 150, 263, and the proposal may also refer to line 189 (in `updateFeriado`'s pre-check block). **Resolve in sdd-tasks** by reading `actions/feriados.ts` at apply time. Default assumption: 3 sites = lines 150, 189, 263.
- [ ] The vitest `tests/` pattern (`tests/**/*.test.ts`) includes the new file at `tests/gga-diff-filter.test.ts`. Confirm during apply that the include glob in `vitest.config.ts` does not need updating.

## Next Step

Ready for `sdd-tasks` (task breakdown into atomic work units per `work-unit-commits`).
