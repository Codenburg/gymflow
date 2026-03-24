# Archive: Search/Filter Refactor (2026-03-20)

## Summary

Refactored the search and filter system to eliminate infinite loop caused by bidirectional synchronization between URL and React state.

## Problem

The previous implementation had circular dependencies:
- EFFECT 4 wrote to URL when `query` or `trainerFilters` changed
- SearchBar EFFECT read from URL and wrote to `query` state
- When `router.replace()` updated URL, `searchParams` object changed
- This triggered effects that could re-trigger the router call → infinite loop

Additionally, two bugs were present:
1. Double X button (native browser + manual)
2. Spaces in search terms were trimmed, preventing multi-word searches

## Solution

### Architecture Change

**Before**: Bidirectional sync (URL ↔ State via effects)
**After**: URL is single source of truth

### Key Changes

1. **Eliminated ALL effects that write to URL**
   - Removed EFFECT 4 (sync to URL)
   - Removed EFFECT 1 (init trainers from URL - now via useMemo)
   - Removed debounce effects for URL sync

2. **State derived from URL via useMemo**
   - `query = useMemo(() => searchParams.get("search") ?? "", [searchParams])`
   - `trainerFilters = useMemo(() => parseTrainers(searchParams), [searchParams])`

3. **Event handlers are ONLY place that writes to URL**
   - `setQuery(value)` → `updateSearchParams(value, trainerFilters)`
   - `toggleTrainerFilter(name)` → `updateSearchParams(query, newFilters)`
   - Pure function builds URL from scratch, no dependency on current `searchParams`

4. **Bug fixes**
   - Hidden native browser clear button via CSS
   - `trim()` only for empty checks, not when storing in URL

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/use-unified-search.ts` | Complete rewrite |
| `src/components/search/search-bar.tsx` | Removed useEffect |
| `src/components/search/search-input.tsx` | Added CSS to hide native clear, preserve spaces |

## Verification

- TypeScript compilation: ✅ No errors
- Search flow: ✅ Correct URL-driven architecture
- Trainer filter flow: ✅ Preserves query when toggling
- Space handling: ✅ Preserves spaces in middle of search terms
- Edge cases: ✅ All handled correctly

## Date

2026-03-20
