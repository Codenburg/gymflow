# Proposal: Update README and PRD

## Intent

The README.md and PRD.md are out of sync with reality. README lacks version precision, deployment info, Docker instructions, and has an awkward "Privado" license. PRD has vague Phase 4, unresolved open issues, and a stack mismatch with README. This change synchronizes both documents to reflect the current state of the codebase.

## Scope

### In Scope
- **README.md updates:**
  - Add version number and last updated date
  - Precise stack versions ("Next.js 16.1.6" not "Next.js 16")
  - Add deployment section (Vercel, Railway)
  - Add Docker instructions (docker-compose.yml exists but undocumented)
  - Add troubleshooting/FAQ section
  - Add contribution guidelines
  - Complete scripts list (add `db:push`, `db:studio`, `db:generate`)
  - Fix license from "Privado" to proper SPDX identifier

- **PRD.md updates:**
  - Sync stack version with README (Next.js 16.1.6)
  - Detail Phase 4 with specifics: which E2E tests, what API docs, cache warming strategy
  - Address or explicitly defer Open Issues
  - Add future roadmap beyond Phase 4
  - Mention PDF generation library

### Out of Scope
- Code changes (no implementation)
- Creating new documentation files
- Modifying openspec folder structure

## Approach

1. **Audit current state**: Read README.md, PRD.md, package.json, docker-compose.yml to catalog exact gaps
2. **Update README.md in-place**: Apply fixes following existing document structure
3. **Update PRD.md in-place**: Sync stack, detail Phase 4, address Open Issues, add roadmap
4. **Verify consistency**: Ensure README and PRD mention same versions and features

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `README.md` | Modified | Sync versions, add deployment/Docker/scripts sections |
| `PRD.md` | Modified | Sync stack, detail Phase 4, address Open Issues, add roadmap |
| `openspec/PRD.md` | Modified | Same as above (this is the canonical PRD location) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| README/PRD drift after future changes | High | Add periodic sync toDefinition Definition Definition Definition Definition Definition Definition Definition Definition Definition Definition Definition Definition Definition Definition Definition "definition" |
| Docker instructions becoming stale | Medium | Keep Docker section minimal, link to docker-compose.yml comments |
| Over-documenting Phase 4 specifics | Low | Only document concrete planned items, not speculation |

## Rollback Plan

Both files are under git version control. To rollback:
```bash
git checkout HEAD -- README.md openspec/PRD.md
```

## Dependencies

- None (documentation-only change)

## Success Criteria

- [ ] README shows exact versions matching package.json (Next.js 16.1.6, React 19.2.3, etc.)
- [ ] README includes working Docker commands
- [ ] README lists all npm scripts from package.json
- [ ] README has version + last updated date
- [ ] PRD Phase 4 specifies: E2E coverage scope, API doc tool, cache warming approach
- [ ] PRD Open Issues are either addressed or explicitly deferred with rationale
- [ ] Both documents reference the same stack versions
- [ ] README license is a valid SPDX identifier (e.g., "MIT" or "UNLICENSED")
