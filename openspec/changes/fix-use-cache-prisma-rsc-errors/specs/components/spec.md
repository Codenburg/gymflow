# Delta for components

## Purpose

Add a requirement that `ErrorState` is a React Client Component, because it renders a `<Button>` with an `onClick` handler (`window.location.reload()`). React Server Components cannot pass event handlers to Client Component props, which produced the runtime error `Event handlers cannot be passed to Client Component props` in `src/app/(public)/page.tsx:116` and the cascading `ErrorBoundary:homepage` failure.

## ADDED Requirements

### Requirement: ErrorState Is a Client Component

The `ErrorState` component (`src/components/ui/error-state.tsx`) MUST be a React Client Component: the file MUST start with the `"use client"` directive at the top of the module. The component MUST continue to render the error icon, the user-facing message, and a `<Button>` with an `onClick` handler that calls `window.location.reload()`. The component MUST keep the existing `data-testid="error-state"` attribute for Playwright selectors.

(Reason: The component renders a `<Button>` with `onClick={() => window.location.reload()}`. As a Server Component, React threw `Event handlers cannot be passed to Client Component props` when the homepage's error path rendered it, cascading into the `ErrorBoundary:homepage` error boundary. Marking the file as `"use client"` lets the runtime attach the click handler in the browser.)

#### Scenario: ErrorState module declares use client

- GIVEN `src/components/ui/error-state.tsx` exists
- WHEN the file is read
- THEN the first non-comment statement MUST be the `"use client"` directive
- AND the module MUST continue to export `ErrorState` as a named export

#### Scenario: ErrorState reintentar button invokes reload

- GIVEN the homepage error path renders `<ErrorState message="..." />`
- WHEN the user clicks the "Reintentar" button
- THEN the browser SHALL call `window.location.reload()`
- AND the page SHALL reload with a fresh data fetch

#### Scenario: ErrorState does not throw Event handlers error

- GIVEN any Server Component (e.g. `app/(public)/page.tsx`, `app/error.tsx`) renders `<ErrorState message="..." />`
- WHEN React renders the tree
- THEN the browser console SHALL NOT contain `Event handlers cannot be passed to Client Component props`
- AND the error boundary SHALL NOT trigger

#### Scenario: ErrorState keeps data-testid for E2E selectors

- GIVEN a Playwright test selects the error state UI
- WHEN the test runs
- THEN `[data-testid="error-state"]` SHALL resolve to the rendered wrapper element
- AND the "Reintentar" button SHALL be visible and clickable