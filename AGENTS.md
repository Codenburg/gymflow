## ⚠️ CRITICAL RULES — IGNORING THESE IS UNACCEPTABLE

### GIT RULES
- **NEVER run `git reset` (hard, soft, mixed) without explicit user permission.**
- **NEVER run interactive `git rebase` without explicit user permission.**
- **Before any destructive git operation, STOP and ASK.**

### Frameworks & Libraries

When working with **React 19** (React Compiler, Server Components, Actions), read `~/skills/react-19/SKILL.md` first.

When working with **Next.js** (App Router, RSC, API routes, caching), read `~/skills/next-best-practices/SKILL.md` first.

When working with **Next.js 16 Cache Components** (PPR, use cache, cacheLife, cacheTag), read `~/skills/next-cache-components/SKILL.md` first.

When working with **Vercel React/Next.js best practices** (performance, data fetching, bundle optimization), read `~/skills/vercel-react-best-practices/SKILL.md` first.

When working with **React Hook Form** (useForm, useWatch, useController, useFieldArray), read `~/skills/react-hook-form/SKILL.md` first.

When working with **Zustand 5** (state management, persist, immer, devtools, slices), read `~/skills/zustand-5/SKILL.md` first.

When working with **shadcn/ui** (component registry, presets, styling, components.json), read `~/skills/shadcn/SKILL.md` first.

When working with **TanStack Table** (headless tables, sorting, filtering, pagination, datagrids), read `~/skills/tanstack-table/SKILL.md` first.

When working with **Zod 4** (schema validation, breaking changes from v3, top-level validators), read `~/skills/zod-4/SKILL.md` first.

When working with **TypeScript advanced types** (generics, conditional types, mapped types, template literals), read `~/skills/typescript-advanced-types/SKILL.md` first.

---

### Styling & Design

When working with **Tailwind CSS v4** (design tokens, component libraries, responsive, dark mode), read `~/skills/tailwind-design-system/SKILL.md` first.

When working with **Expo + Tailwind** (NativeWind v5, Tailwind v4.1, react-native-css, import rewrite), read `~/skills/expo-tailwind-setup/SKILL.md` first.

When working with **Frontend Design** (production-grade interfaces, landing pages, dashboards, components), read `~/skills/frontend-design/SKILL.md` first.

---

### Database & ORM

When working with **Prisma** (type-safe database operations, schema design, Prisma Client, migrations), read `~/skills/prisma/SKILL.md` first.

When working with **Prisma Database Setup** (PostgreSQL, MySQL, SQLite, MongoDB, connection config), read `~/skills/prisma-database-setup/SKILL.md` first.

---

### Testing

When working with **Playwright** (E2E tests, Page Objects, locators, test structure), read `~/skills/playwright/SKILL.md` first.

When working with **Web App Testing** (Playwright toolkit for local apps, screenshots, browser logs), read `~/skills/webapp-testing/SKILL.md` first.

When working with **Go Testing** (Bubbletea TUI, teatest, golden files), read `~/skills/go-testing/SKILL.md` first.

---

### Development Workflows

When working with **Spec-Driven Development** (SDD), read `~/skills/sdd-init/SKILL.md` first.

When creating a **new SDD change proposal**, read `~/skills/sdd-propose/SKILL.md` first.

When **writing SDD specifications**, read `~/skills/sdd-spec/SKILL.md` first.

When **creating SDD technical design**, read `~/skills/sdd-design/SKILL.md` first.

When **breaking down SDD into tasks**, read `~/skills/sdd-tasks/SKILL.md` first.

When **implementing SDD tasks**, read `~/skills/sdd-apply/SKILL.md` first.

When **verifying SDD implementation**, read `~/skills/sdd-verify/SKILL.md` first.

When **archiving a completed SDD change**, read `~/skills/sdd-archive/SKILL.md` first.

When **exploring codebase or thinking through ideas**, read `~/skills/sdd-explore/SKILL.md` first.

When **onboarding to SDD** (guided walkthrough), read `~/skills/sdd-onboard/SKILL.md` first.

When doing **Code Review** (adversarial, dual-judge, fix and re-judge), read `~/skills/judgment-day/SKILL.md` first.

When doing **TypeScript + React code review** (anti-patterns, state management, useEffect, type safety, code smells), read `~/skills/typescript-react-reviewer/SKILL.md` first.

When **splitting oversized changes** into chained or stacked PRs, read `~/skills/chained-pr/SKILL.md` first.

When **planning commits** as reviewable work units, read `~/skills/work-unit-commits/SKILL.md` first.

When **designing documentation** with reduced cognitive load, read `~/skills/cognitive-doc-design/SKILL.md` first.

---

### GitHub & Issues

When **creating GitHub issues** or **reporting bugs**, read `~/skills/issue-creation/SKILL.md` first.

When **creating pull requests**, read `~/skills/branch-pr/SKILL.md` first.

When **writing collaboration comments** (PR feedback, reviews, Slack, GitHub comments), read `~/skills/comment-writer/SKILL.md` first.

---

### Project Maintenance

**HARD RULE — `docs-guardian` sync (mandatory after every `fix:` / `feat:` commit):**

The `docs-guardian` skill (`~/.config/opencode/skills/docs-guardian/SKILL.md`, v1.2) is **mandatory** in two situations:

1. **After any `fix:` or `feat:` commit lands** — the orchestrator MUST load the skill and run a sync. The skill consults the user on non-trivial decisions (severity, §Pendiente removal, force-bump, multi-fix count, revert handling, pre-release, test failures). Updates:
   - `package.json` version (PATCH for `fix:` criteria-met, MINOR for `feat:`, MAJOR for `BREAKING CHANGE:`; pre-release via `--pre-release <alpha|beta|rc>` always resets to `.pre.1`)
   - `openspec/CHANGELOG.md` (prepend `[X.Y.Z] - YYYY-MM-DD` entry with 🔴/🟡 detailed bullets + 🟢 grouped + 🔄 for reverts; language auto-detected from last 5 entries, default `es`)
   - `README.md` version badge (text plain, no badge image)
   - `openspec/ROADMAP.md` §Completado entry + patch bump table (cleared per cycle, pending-only)

2. **After `sdd-archive` completes** — the archive sub-agent MUST verify the docs-guardian sync was done (see sdd-archive skill §"Docs-Guardian Sync Gate"). If not, archive returns `blocked` and the orchestrator invokes the skill, re-runs archive.

**Triggers** (in priority order):
- Commit message starts with `fix:` → accumulate in patch bump table; PATCH when criteria met (🔴 ≥ 1, 🟡 ≥ 2, 🟢 ≥ 3). Multi-fix commits decompose into N entries.
- Commit message starts with `revert:` → document as 🔄 in CHANGELOG, do NOT enter patch bump table
- Commit message starts with `feat:` → ASK: MINOR puro? If MINOR, ASK: pre-release?
- Commit body contains `BREAKING CHANGE:` → MAJOR (ASK: pre-release?)
- §Completado entry added in ROADMAP.md with `vX.Y.Z` label → confirms a release-worthy change

**Conventions enforced by the skill** (no `[x]` markers in ROADMAP — see skill core principles):
- ROADMAP is **pending only** — completed items go to CHANGELOG (not back to ROADMAP with `[x]`)
- The patch bump table **clears per cycle** — entries move to CHANGELOG on bump, table restarts empty
- §Pendiente items removed by the skill ONLY after user confirms the commit matches (heuristic keyword match, tier-filtered: 🔴 only matches Alta/Media, 🟢 only matches Baja)
- Severity classification 🔴/🟡/🟢 requires user confirmation (skill does NOT auto-classify)
- Force-bumps (criteria not MET) require user opt-in AND add an audit note in CHANGELOG
- Optional `--verify-tests` runs `pnpm test` before sync; ASK if tests fail
- CHANGELOG validation: pre-sync checks whole file per Keep a Changelog 1.1.0; post-sync checks new entry format

**Out of scope** (does NOT trigger the sync): `docs:`, `chore:`, `refactor:`, `test:`, `style:`, `perf:` commits. These commits may be reflected in the next CHANGELOG entry as part of the cumulative release notes when a `fix:` or `feat:` triggers a bump.

**Known v1.x limitations** (out of scope): race conditions between parallel SDD cycles, monorepo support, auto-detect of completed §Pendiente items without keyword match, multi-package-manager test commands, pre-release counter tracking, language override flag.

**Reference**: `~/.config/opencode/skills/docs-guardian/SKILL.md` (v1.2). Supersedes `readme-guardian` (deprecated 2026-06-21).

---

### Skill Development

When **creating new AI agent skills**, read `~/skills/skill-creator/SKILL.md` first.

When **searching for available skills**, read `~/skills/find-skills/SKILL.md` first.

When **improving or auditing** existing AI agent skills, read `~/skills/skill-improver/SKILL.md` first.

When **updating the skill registry** after adding or removing skills, read `~/skills/skill-registry/SKILL.md` first.

## References

- project rules: `~/openspec/config.yaml`
- 
---

## Critical Rules (ALL files)

REJECT if:

- Hardcoded secrets/credentials
- `console.log` in production code
- Missing error handling
