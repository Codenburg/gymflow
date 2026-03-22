# Archive: Search Debounce & Idempotency Refactor (2026-03-20)

## Summary

Implemented dual-state pattern (inputValue local + URL debounced) with proper idempotency, cancelation, and stable serialization to prevent loops, redundant writes, and race conditions.

## Problem

Previous implementation had several technical debts and risks:
1. **No debounce**: Every keystroke triggered server re-render
2. **router.push**: Polluted browser history with intermediate search states
3. **No idempotency**: Same logical state could generate different URLs
4. **Race conditions**: No protection against concurrent updates
5. **Navigation during debounce**: inputValue could desync from query

## Solution

### Architecture: Dual State Pattern

```
User types → setInputValue (immediate local) → debounce 300ms → router.replace() → URL
                                    ↓
                           prevUrlRef comparison for idempotency
```

### Key Implementation Details

| Feature | Implementation |
|---------|----------------|
| **Local state** | `inputValue` via useState for immediate UI response |
| **Debounce** | `setTimeout` with cleanup on each keystroke |
| **Idempotency** | `prevUrlRef` stores last written URL, compare before replace |
| **Stable serialization** | `[...trainers].sort().join(",")` for consistent URLs |
| **Navigation sync** | `prevUrlRef` diff detects real navigation vs our own writes |
| **Cancelation** | `cancelDebounce()` called before every URL-write operation |
| **Mount protection** | `isMountedRef` check inside timeout callback |

### Guards Implemented

1. **Sync guard**: `if (currentUrl === prevUrlRef.current) return;`
2. **Idempotency guard**: `if (newUrl === prevUrlRef.current) return false;`
3. **Cancelation**: `cancelDebounce()` before router.replace in all handlers
4. **Mount guard**: `if (!isMountedRef.current) return;` in timeout callback
5. **Stable sort**: `trainerFilters.sort()` before join

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/use-unified-search.ts` | Complete rewrite with dual state pattern |
| `src/components/search/search-bar.tsx` | Uses `inputValue` instead of `query` |
| `src/components/search/search-input.tsx` | Added `onClear` prop for explicit clear handler |

## Benefits

- **Server re-renders**: N (keystrokes) → 1 (after typing stops)
- **Browser history**: Clean - back button goes to previous page, not each search state
- **Idempotent**: Same logical state always produces same URL
- **No desync**: Navigation during typing correctly detected and synced
- **Robust**: Race conditions and mount cleanup properly handled

## Verification

- TypeScript: ✅ No errors in src/
- Architecture: ✅ No loops, no redundant writes
- Guards: ✅ All 5 implemented correctly

## Date

2026-03-20
