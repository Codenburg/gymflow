# Proposal: Migrate from npm to pnpm

## Intent

Replace npm with pnpm for faster installs, content-addressable disk efficiency, stricter dependency isolation, and team consistency. The project already declares pnpm 11.2.2 in CONTRIBUTING.md — this aligns tooling with intent.

## Scope

### In Scope
- Generate `pnpm-lock.yaml` via `pnpm import`, remove `package-lock.json`
- Add `packageManager` field to `package.json`
- Update `playwright.config.ts` webserver command (`npm` → `pnpm`)
- Update `openspec/config.yaml` engine (`npm` → `pnpm`)
- Convert `npx`-based scripts to `pnpm dlx` (`db:seed`, `prisma.seed`)
- Update `README.md` / `CONTRIBUTING.md` npm→pnpm commands
- Add `.npmrc` (shamefully-hoist=false)
- Verify: fresh install, dev, build, lint, test:unit

### Out of Scope
- No framework/runtime/dependency version changes
- No Docker, CI/CD, or git hooks changes (none exist in repo)

## Capabilities

> Build-tool migration — no spec-level behavior changes.

### New Capabilities
- None

### Modified Capabilities
- None

## Approach

1. `pnpm import` from existing `package-lock.json` to preserve exact versions
2. Update `package.json` — add `packageManager`, convert `npx` → `pnpm dlx`
3. Update `playwright.config.ts`, `config.yaml`, README, CONTRIBUTING
4. Add `.npmrc` with pnpm strict mode, remove `package-lock.json`
5. Full verify cycle from clean state

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `package.json` | Modified | Add `packageManager`, `npx` → `pnpm dlx` |
| `playwright.config.ts` | Modified | `npm run dev` → `pnpm run dev` |
| `openspec/config.yaml` | Modified | Engine: `npm` → `pnpm` |
| `README.md` | Modified | CLI commands npm→pnpm |
| `CONTRIBUTING.md` | Modified | CLI commands npm→pnpm |
| `package-lock.json` | Removed | Replaced by `pnpm-lock.yaml` |
| `.npmrc` | New | pnpm config (shamefully-hoist=false) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Hoisting differences break imports | Low | Test all scripts post-migration |
| `postinstall` (prisma generate) fails | Low | Verify post-install hook |
| Version drift on import | Low | `pnpm import` preserves lockfile versions |

## Rollback Plan

1. Delete `pnpm-lock.yaml`, `.npmrc`; revert `package.json`
2. Restore `package-lock.json` via git checkout
3. Revert `playwright.config.ts`, docs, `config.yaml`
4. Confirm clean state with `npm install`

## Dependencies

- pnpm ^11.2.2 (matching existing CONTRIBUTING.md entry)

## Success Criteria

- [ ] `pnpm install` completes from clean checkout with zero errors
- [ ] `pnpm run dev` starts on port 3000
- [ ] `pnpm run build` succeeds
- [ ] `pnpm run lint` passes
- [ ] `pnpm run test:unit` passes
- [ ] All docs consistently reference pnpm
