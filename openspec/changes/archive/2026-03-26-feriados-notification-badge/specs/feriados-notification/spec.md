# Feriados Notification Badge Specification

## Purpose

Implementar un badge de notificación en el navbar que alerte al usuario cuando hay un nuevo Feriado creado desde su última visita. El badge aparece en el botón de "Feriados" del homepage para indicar contenido nuevo no visto.

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

### Requirement: Homepage Server Component Integration

The homepage (Server Component) MUST import and render the `FeriadosNavButton` client component.

#### Scenario: Homepage includes FeriadosNavButton

- GIVEN the homepage renders
- WHEN the Server Component includes `<FeriadosNavButton />`
- THEN the client component MUST be hydrated independently
- AND the homepage MUST NOT have hydration warnings

### Requirement: Feriados Page markAsSeen Integration

The Feriados page MUST call `markAsSeen()` when the component mounts.

#### Scenario: Visiting Feriados page clears badge

- GIVEN a user visits `/feriados`
- WHEN the page component mounts
- THEN `markAsSeen()` MUST be called automatically
- AND the badge MUST disappear on subsequent homepage visits
