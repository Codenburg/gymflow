# Search & Filtering Specification

## Purpose

This spec describes the search and filtering functionality, including a separated search input and trainer sidebar filter panel.

---

## Architecture

### URL as Single Source of Truth

The search and filter state is stored **exclusively in the URL query parameters**:
- `?search=<query>` - Text search query (preserves spaces)
- `?trainers=<names>` - Comma-separated trainer filter names

**Implementation rules:**
- NO local state for `query` or `trainerFilters` in client components
- State is derived from URL via `useMemo(() => searchParams.get(...), [searchParams])`
- Event handlers (onChange, onClick) are the **only** place that writes to URL via `router.push()`
- NO effects that write to URL (prevents infinite loops)
- NO effects that sync FROM URL TO state (unnecessary when state derives from URL)

### Data Flow

```
User types/clicks
       ↓
Event handler (setQuery, toggleTrainerFilter, etc.)
       ↓
updateSearchParams(newSearch, newTrainers) ← Pure function, builds URL from scratch
       ↓
router.push(?search=...&trainers=...)
       ↓
URL changes → Next.js re-renders
       ↓
useMemo recalculates derived state
       ↓
UI re-renders with new values
```

---

## ADDED Requirements

### Requirement: Stable Trainer List for Chip Display

The trainer sidebar chips MUST always display all trainers from the complete dataset, regardless of the current filter state.

The implementation MUST:
- Derive trainer list from ALL rutinas (unfiltered) before applying any trainer filter
- Use two separate database queries: one for trainers (unfiltered), one for rutinas (filtered)
- Never filter the trainer list based on the active filter state
- Maintain stable counts based on total routines per trainer

#### Scenario: Chips remain visible when filter is active

- GIVEN multiple trainers exist in the database (e.g., "Nando", "Maxi", "Santi")
- WHEN the user selects "Nando" filter
- THEN all chips (Nando, Maxi, Santi) remain visible
- AND only routines from "Nando" are displayed

#### Scenario: Multiple trainer selection

- GIVEN multiple trainers exist
- WHEN the user selects "Nando" and "Maxi"
- THEN all chips remain visible
- AND routines from both "Nando" and "Maxi" are displayed

#### Scenario: Toggle trainer filter off

- GIVEN "Nando" is selected and other chips are visible
- WHEN the user clicks "Nando" again to deselect
- THEN all chips remain visible
- AND all routines are displayed

### Requirement: Trainer Sidebar as Source of Truth

The trainer sidebar checkbox selection MUST be the only source of truth for filter state.
No additional chips or tags should appear below the search bar.

**IMPORTANT**: The trainer list displayed in the sidebar is derived from ALL rutinas (unfiltered),
ensuring all chips remain visible regardless of filter state. The filtered routines display
is derived separately and does not affect the trainer list.

The sidebar MUST:
- Display each unique trainer name from the database
- Show a count of routines per trainer next to each name
- Provide checkboxes for multiple trainer selection
- Include an "Todos" option to clear all trainer filters
- Visually indicate selected trainers (checkbox + highlight)

#### Scenario: Display trainer list in sidebar

- GIVEN there are trainers with routines in the database
- WHEN the user visits the routines page
- THEN the sidebar displays a list of trainers with checkboxes
- AND each trainer shows their routine count in parentheses

#### Scenario: Select single trainer filter

- GIVEN the trainer sidebar is visible
- WHEN the user checks a trainer checkbox
- THEN the results filter to show only routines from that trainer
- AND no chip appears (sidebar checkbox indicates selection)

#### Scenario: Select multiple trainers

- GIVEN the trainer sidebar is visible
- WHEN the user checks multiple trainer checkboxes
- THEN the results filter to show routines from ANY selected trainer
- AND no chips appear (sidebar checkboxes indicate selection)

#### Scenario: Deselect all trainers (Todos)

- GIVEN one or more trainers are selected
- WHEN the user clicks "Todos" option
- THEN all checkboxes are cleared
- AND the results show routines from all trainers

### Requirement: Simplified Search Input

The search input MUST only filter routines by name (`routine.nombre`).

The input MUST:
- Display centered in the main content area
- Update URL immediately on each keystroke (via router.push)
- Preserve spaces in search terms (e.g., "pierna routine" works correctly)
- Show exactly ONE clear (X) button - browser native clear must be hidden via CSS
- Use `trim()` only for empty value checks, not when storing in URL

#### Scenario: Search by routine name

- GIVEN the search input is empty
- WHEN the user types "pierna" in the search input
- THEN the results filter to show only routines containing "pierna" in the name
- AND the URL updates to `?search=pierna`

#### Scenario: Search with spaces between words

- GIVEN the search input is empty
- WHEN the user types "pierna rutina" (with space)
- THEN spaces are preserved in the search term
- AND the URL updates to `?search=pierna rutina`

#### Scenario: Clear search input

- GIVEN the search input has text and results are filtered
- WHEN the user clicks the clear button (X)
- THEN the input clears
- AND the search param is removed from URL
- AND all routines are displayed (respecting any trainer filters)

#### Scenario: Single clear button

- GIVEN the search input has text
- WHEN the user looks at the input
- THEN only ONE clear (X) button is visible
- AND the native browser search clear button is hidden via CSS

### Requirement: Search Autocomplete

The autocomplete dropdown showing both routines and trainers during typing MUST be removed.

(Reason: Replaced by separated search input and sidebar panel approach)

#### Scenario: Autocomplete no longer appears

- GIVEN the user is typing in the search input
- WHEN the user types any text
- THEN no autocomplete dropdown appears
- AND results only filter when URL updates

### Requirement: Type Selector

The type selector dropdown that filters routines by type MUST be removed.

(Reason: Simplifying the UI to focus on name search and trainer filters only)

---

## Technical Implementation Notes

### File Structure

| File | Responsibility |
|------|----------------|
| `src/hooks/use-unified-search.ts` | Central hook - derives state from URL, provides event handlers |
| `src/components/search/search-bar.tsx` | Presentational - connects input to hook |
| `src/components/search/search-input.tsx` | Input component with clear button |
| `src/components/search/trainer-sidebar.tsx` | Trainer filter UI |
| `src/components/search/trainer-sidebar-client.tsx` | Client wrapper connecting sidebar to hook |
| `src/lib/rutinas.ts` | Server-side data fetching with `getCachedRutinas()` |

### Hook API (useUnifiedSearch)

```typescript
interface UseUnifiedSearchReturn {
  query: string;                    // Derived from URL
  setQuery: (value: string) => void; // Updates URL
  trainerFilters: string[];          // Derived from URL
  toggleTrainerFilter: (name: string) => void; // Updates URL
  clearTrainerFilters: () => void;   // Updates URL
  activeFilters: ActiveFilter[];     // Derived from trainerFilters
  removeFilter: (filter: ActiveFilter) => void; // Updates URL
  clearFilters: () => void;          // Updates URL (clears both search and filters)
}
```

### URL Update Function

`updateSearchParams(newSearch: string, newTrainers: string[])` is the ONLY function that writes to URL:
- Builds `URLSearchParams` from scratch (not based on current params)
- Calls `router.push()` to navigate
- NO effects, NO dependencies on current `searchParams`
