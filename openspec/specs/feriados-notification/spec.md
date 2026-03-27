# Feriados Notification Badge Specification

## Purpose

Implementar un badge de notificación en el navbar que alerte al usuario cuando hay un nuevo Feriado creado desde su última visita. El badge aparece en el botón de "Feriados" del homepage para indicar contenido nuevo no visto.

## Implementation Details

### API Endpoint

- Route handler: `src/app/api/feriados/latest/route.ts`
- Uses `dynamic = "force-dynamic"` to ensure fresh data on every request
- Returns: `{ latestFeriadoDate: string | null }` where date is ISO 8601 format

### Hook: useFeriadosNotification

- Location: `src/hooks/use-feriados-notification.ts`
- Includes focus listener: re-fetches latest date when window gains focus
- localStorage operations are encapsulated inside useEffect (client-side only)
- Does NOT expose `isLoading` state - external components receive stable values
- Return interface: `{ hasNew: boolean, markAsSeen: () => void }`

### markAsSeen Pattern

- Server component fetches `latestFeriadoDate` and passes it as a prop to `MarkAsSeenWrapper`
- `MarkAsSeenWrapper` accepts `latestFeriadoDate: string | null` as a prop
- `markAsSeen()` persists the server-provided `latestFeriadoDate` to localStorage
- This ensures the "seen" timestamp matches what the server had at page load, not client time

### Badge Component

- Badge is rendered INSIDE a Next.js `Link` component
- Uses CSS: `absolute` positioning, `rounded-full`, `bg-red-600`
- Positioned top-right relative to the link
- Only renders when `hasNew === true`

### Layout: Desktop

- Search input: `flex-1` to take remaining space
- Action buttons: right-aligned in the same row
- Responsive: same layout on desktop breakpoints

### Layout: Mobile

- Search input: full width
- Action buttons: stacked below search
- Uses responsive breakpoint (md:)

### InfoButton Component

- Separate component created for displaying informational content
- Located in `src/components/feriados/info-button.tsx`

### Single Source of Truth

- `FeriadosNavButton` is the single source of truth for badge display logic
- No duplicate badge logic elsewhere in the codebase

## ADDED Requirements

### Requirement: Latest Feriado Date API Endpoint

The system MUST provide a lightweight API endpoint `GET /api/feriados/latest` that returns the creation date of the most recently created Feriado in ISO 8601 format.

#### Scenario: Request latest Feriado date successfully

- GIVEN the system has at least one Feriado in the database
- WHEN a client makes a GET request to `/api/feriados/latest`
- THEN the response MUST be `{ "latestFeriadoDate": "2026-03-26T00:00:00.000Z" }`

#### Scenario: Request latest Feriado date when no feriados exist

- GIVEN the system has no Feriado records
- WHEN a client makes a GET request to `/api/feriados/latest`
- THEN the response MUST be `{ "latestFeriadoDate": null }`

#### Scenario: API endpoint fails gracefully

- GIVEN the database query fails
- WHEN a client makes a GET request to `/api/feriados/latest`
- THEN the response MUST be `{ "latestFeriadoDate": null }` with appropriate error logging

### Requirement: API Uses force-dynamic

The API route MUST use `export const dynamic = "force-dynamic"` to ensure fresh data on every request.

#### Scenario: API returns fresh data on each request

- GIVEN the API route has `dynamic = "force-dynamic"`
- WHEN a client makes multiple requests to `/api/feriados/latest`
- THEN each response MUST reflect the current state of the database

### Requirement: Feriados Notification Hook

The system MUST provide a hook `useFeriadosNotification` that encapsulates all notification badge logic including fetching, comparison, and localStorage persistence.

#### Scenario: First visit - badge must NOT appear

- GIVEN the user has no `feriados_last_seen_at` in localStorage
- AND the API returns a valid `latestFeriadoDate`
- WHEN the hook mounts and fetches the latest date
- THEN the hook MUST auto-save `latestFeriadoDate` to localStorage
- AND `hasNew` MUST be `false`
- AND the badge MUST NOT be displayed

#### Scenario: Returning visit with new Feriado

- GIVEN the user has `feriados_last_seen_at` set to `"2026-03-01T00:00:00.000Z"` in localStorage
- AND a new Feriado was created on `"2026-03-25T00:00:00.000Z"`
- WHEN the hook compares `latestFeriadoDate` > `lastSeen`
- THEN `hasNew` MUST be `true`
- AND the badge MUST be displayed

#### Scenario: Returning visit with no new Feriado

- GIVEN the user has `feriados_last_seen_at` set to `"2026-03-25T00:00:00.000Z"` in localStorage
- AND the latest Feriado was created on `"2026-03-25T00:00:00.000Z"`
- WHEN the hook compares `latestFeriadoDate` > `lastSeen`
- THEN `hasNew` MUST be `false`
- AND the badge MUST NOT be displayed

#### Scenario: API returns null

- GIVEN the API returns `latestFeriadoDate: null`
- WHEN the hook processes this response
- THEN `hasNew` MUST be `false`
- AND the badge MUST NOT be displayed

#### Scenario: Network or fetch error

- GIVEN the fetch to `/api/feriados/latest` fails
- WHEN the hook catches the error
- THEN `hasNew` MUST be `false` (FAIL-SAFE)
- AND the badge MUST NOT be displayed

### Requirement: Focus Listener

The hook MUST re-fetch the latest Feriado date when the window regains focus.

#### Scenario: Focus triggers refetch

- GIVEN the hook has previously fetched and cached `latestFeriadoDate`
- WHEN the user switches to another tab and returns to the page (window focus event)
- THEN the hook MUST re-fetch `/api/feriados/latest`
- AND update `hasNew` if the comparison result changes

### Requirement: localStorage Inside Effect

The hook MUST perform all localStorage operations inside useEffect to ensure client-side only execution.

#### Scenario: localStorage accessed only on client

- GIVEN the component containing the hook is server-rendered
- WHEN the useEffect runs after mount
- THEN localStorage MUST be accessed only at that time
- AND no hydration mismatch MUST occur

### Requirement: No isLoading State

The hook MUST NOT expose `isLoading` state to external components.

#### Scenario: Stable values provided

- GIVEN the hook is fetching data
- WHEN external components read from the hook
- THEN they MUST receive stable `hasNew` and `markAsSeen` values
- AND components MUST NOT need to handle loading states

### Requirement: ISO String Comparison

The system MUST compare dates using direct ISO string lexicographic comparison without parsing to Date objects.

#### Scenario: ISO string comparison is valid

- GIVEN `latestFeriadoDate` is `"2026-12-25T00:00:00.000Z"`
- AND `lastSeen` is `"2026-01-01T00:00:00.000Z"`
- WHEN the comparison `latestFeriadoDate > lastSeen` is evaluated
- THEN the result MUST be `true`

#### Scenario: ISO string comparison with same date

- GIVEN `latestFeriadoDate` is `"2026-03-25T00:00:00.000Z"`
- AND `lastSeen` is `"2026-03-25T00:00:00.000Z"`
- WHEN the comparison `latestFeriadoDate > lastSeen` is evaluated
- THEN the result MUST be `false`

### Requirement: markAsSeen Function

The system MUST provide a `markAsSeen()` function that persists the server's `latestFeriadoDate` to localStorage, NOT the current client time.

#### Scenario: markAsSeen persists server date

- GIVEN `latestFeriadoDate` is `"2026-03-25T00:00:00.000Z"`
- WHEN the user calls `markAsSeen()`
- THEN localStorage MUST store `"2026-03-25T00:00:00.000Z"` under key `feriados_last_seen_at`
- AND subsequent visits MUST show no badge until a newer Feriado is created

#### Scenario: markAsSeen with null date

- GIVEN `latestFeriadoDate` is `null`
- WHEN the user calls `markAsSeen()`
- THEN localStorage MUST NOT be modified

### Requirement: MarkAsSeenWrapper Receives Server Date

The `MarkAsSeenWrapper` component MUST accept `latestFeriadoDate` as a prop from the server.

#### Scenario: Server fetches and passes date

- GIVEN a server component fetches `latestFeriadoDate`
- WHEN it renders `MarkAsSeenWrapper` with that date
- THEN the wrapper MUST use that exact value (not re-fetch)

### Requirement: Post-Hydration Rendering

The notification badge component MUST avoid hydration mismatches by only rendering after client-side mount.

#### Scenario: Server-side render returns safe placeholder

- GIVEN the `FeriadosNavButton` component is rendered on the server
- WHEN the component initializes
- THEN it MUST return `null` or a placeholder without the badge
- AND `hasNew` MUST initially be `false`

#### Scenario: Client-side mount triggers actual state

- GIVEN the `FeriadosNavButton` component has mounted on the client
- WHEN the useEffect runs and fetches the latest date
- THEN the component SHOULD re-render with the correct `hasNew` state
- AND display or hide the badge accordingly

### Requirement: Badge Display Logic

The system MUST display the notification badge ONLY when `hasNew` is `true`.

#### Scenario: Badge visible when hasNew is true

- GIVEN `hasNew` is `true`
- WHEN the `FeriadosNavButton` renders
- THEN the badge element MUST be visible in the UI

#### Scenario: Badge hidden when hasNew is false

- GIVEN `hasNew` is `false`
- WHEN the `FeriadosNavButton` renders
- THEN the badge element MUST NOT be visible in the UI

### Requirement: Badge Styling

The badge MUST be styled with absolute positioning, rounded-full shape, and red-600 background.

#### Scenario: Badge has correct styling

- GIVEN the badge is rendered (hasNew is true)
- WHEN the component displays
- THEN the badge MUST have: `absolute` position, `rounded-full`, `bg-red-600`
- AND it MUST be positioned top-right relative to the parent Link

### Requirement: Badge Inside Link

The badge MUST be rendered as a child element inside the Next.js `Link` component.

#### Scenario: Badge nested in Link

- GIVEN `hasNew` is `true`
- WHEN `FeriadosNavButton` renders
- THEN the badge element MUST be nested inside the `<Link to="/feriados">` element

### Requirement: Homepage Server Component Integration

The homepage (Server Component) MUST import and render the `FeriadosNavButton` client component.

#### Scenario: Homepage includes FeriadosNavButton

- GIVEN the homepage renders
- WHEN the Server Component includes `<FeriadosNavButton />`
- THEN the client component MUST be hydrated independently
- AND the homepage MUST NOT have hydration warnings

### Requirement: Desktop Layout

On desktop viewports, the search input and action buttons MUST be in the same row.

#### Scenario: Desktop horizontal layout

- GIVEN the viewport width is desktop (md: and above)
- WHEN the homepage nav renders
- THEN the search input MUST have `flex-1`
- AND buttons MUST be right-aligned in the same container

### Requirement: Mobile Layout

On mobile viewports, the search input and action buttons MUST stack vertically.

#### Scenario: Mobile stacked layout

- GIVEN the viewport width is mobile (below md:)
- WHEN the homepage nav renders
- THEN the search input MUST be full width
- AND buttons MUST stack below the search

### Requirement: Feriados Page markAsSeen Integration

The Feriados page MUST call `markAsSeen()` when the component mounts.

#### Scenario: Visiting Feriados page clears badge

- GIVEN a user visits `/feriados`
- WHEN the page component mounts
- THEN `markAsSeen()` MUST be called automatically
- AND the badge MUST disappear on subsequent homepage visits

### Requirement: InfoButton Component

A separate `InfoButton` component MUST exist for displaying informational content about feriados.

#### Scenario: InfoButton component exists

- GIVEN the `InfoButton` component is needed
- WHEN it is rendered
- THEN it MUST display relevant information about Feriados

### Requirement: Single Source of Truth

`FeriadosNavButton` MUST be the single source of truth for badge display logic.

#### Scenario: No duplicate badge logic

- GIVEN badge display logic exists in `FeriadosNavButton`
- WHEN other components in the codebase need to display a badge
- THEN they MUST use `FeriadosNavButton` or its hook
- AND badge logic MUST NOT be duplicated elsewhere
