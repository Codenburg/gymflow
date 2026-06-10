# Delta for API

## MODIFIED Requirements

### Requirement: GET /api/gym Endpoint

The system MUST provide a read-only endpoint to retrieve the current gym configuration. The response MUST include the structured `horarioJson` (validated `HorarioSemanal` object or `null`) in place of the previous free-text `horario` field, plus the remaining display fields (`nombre`, `direccion`, `mapsEmbedUrl`, `socialInstagram`, `socialWhatsapp`) and existing `price`, `createdAt`, `updatedAt`.
(Previously: The response included `horario` as a free-text string.)

#### Scenario: Fetch gym configuration successfully

- GIVEN A Gym record exists with id "gym" in the database
- WHEN A GET request is made to /api/gym
- THEN The response MUST return HTTP status 200
- AND The response body MUST contain the Gym object with id, price, createdAt, updatedAt
- AND The response body MUST also include nombre, horarioJson, direccion, mapsEmbedUrl, socialInstagram, socialWhatsapp (any MAY be null)
- AND a `horario` free-text field MUST NOT appear in the response

#### Scenario: Fetch gym when database is empty

- GIVEN No Gym record exists in the database
- WHEN A GET request is made to /api/gym
- THEN The response MUST return HTTP status 200
- AND The response MUST return a default Gym object with id "gym" and price 0 (auto-create)
- AND all new display fields MUST default to null (including `horarioJson`)

#### Scenario: Fetch gym with partial fields

- GIVEN Only `nombre` and `horarioJson` are set; other display fields are null
- WHEN A GET request is made to /api/gym
- THEN The response MUST include nombre and horarioJson with their values
- AND null fields MUST be JSON `null` (not omitted, not empty string)
- AND `horarioJson`, when present, MUST be a JSON object (never a string)

#### Scenario: horarioJson is Zod-validated at read time

- GIVEN The DB row contains a value in `horarioJson` that fails `horarioSemanalSchema` (corrupt or legacy shape)
- WHEN A GET request is made to /api/gym
- THEN the response MUST return `horarioJson: null` (do NOT propagate unvalidated data)
- AND the response MUST still return HTTP 200

### Requirement: PATCH /api/gym Endpoint

The system MUST provide an authenticated endpoint to update gym configuration. The endpoint MUST accept any subset of the five String display fields plus `horarioJson` plus `price`, validate via Zod, and reject invalid input with HTTP 400 and field-level error details.
(Previously: The endpoint accepted a free-text `horario` string; it now accepts a structured `horarioJson` object.)

#### Scenario: Update gym price successfully

- GIVEN A user is authenticated as admin
- AND A Gym record exists with id "gym" and price 45000
- WHEN A PATCH request is made to /api/gym with body `{ "price": 50000 }`
- THEN The response MUST return HTTP status 200
- AND The response body MUST contain the updated Gym object
- AND The database MUST have the new price persisted

#### Scenario: Update display fields successfully

- GIVEN An authenticated admin
- AND A Gym record with `nombre = "Old"`
- WHEN A PATCH is made with `{ "nombre": "New", "horarioJson": { lun: { abierto: true, apertura: "08:00", cierre: "22:00" }, mar: { abierto: true, apertura: "08:00", cierre: "22:00" }, mie: { abierto: true, apertura: "08:00", cierre: "22:00" }, jue: { abierto: true, apertura: "08:00", cierre: "22:00" }, vie: { abierto: true, apertura: "08:00", cierre: "22:00" }, sab: { abierto: true, apertura: "09:00", cierre: "14:00" }, dom: { abierto: false, apertura: null, cierre: null } } }`
- THEN The response MUST return HTTP 200
- AND the response body MUST contain the updated Gym object with the new `horarioJson`
- AND the DB MUST persist the new structured value

#### Scenario: Update with invalid horarioJson rejected

- GIVEN An authenticated admin
- WHEN A PATCH is made with `{ "horarioJson": { lun: { abierto: true, apertura: "25:99", cierre: "22:00" } } }` (missing days, bad time)
- THEN The response MUST return HTTP 400
- AND the body MUST contain a validation error for `horarioJson`

#### Scenario: Clear horarioJson to null

- GIVEN An authenticated admin
- WHEN A PATCH is made with `{ "horarioJson": null }`
- THEN The response MUST return HTTP 200
- AND the DB MUST persist `horarioJson = null`

#### Scenario: Update price with invalid input

- GIVEN An authenticated admin
- WHEN A PATCH is made with `{ "price": -100 }`
- THEN The response MUST return HTTP 400
- AND the body MUST contain validation error details

#### Scenario: Invalid URL for socialInstagram

- GIVEN An authenticated admin
- WHEN A PATCH is made with `{ "socialInstagram": "not-a-url" }`
- THEN The response MUST return HTTP 400 with a validation error for `socialInstagram`

#### Scenario: Invalid URL for mapsEmbedUrl

- GIVEN An authenticated admin
- WHEN A PATCH is made with `{ "mapsEmbedUrl": "not-a-url" }`
- THEN The response MUST return HTTP 400 with a validation error for `mapsEmbedUrl`

#### Scenario: Update without authentication

- GIVEN No authenticated session
- WHEN A PATCH is made to /api/gym
- THEN The response MUST return HTTP 401 with an error message

#### Scenario: Update without admin privileges

- GIVEN An authenticated non-admin user
- WHEN A PATCH is made to /api/gym
- THEN The response MUST return HTTP 403 with an error message

### Requirement: Input Validation

The system MUST validate all PATCH input via Zod: positive `price` (existing), non-empty `nombre` when present, valid URL format for `mapsEmbedUrl`, `socialInstagram`, `socialWhatsapp` when present, free-text for `direccion`, and `HorarioSemanal` (or `null`) for `horarioJson`.
(Previously: `horario` was validated as a free-text trimmed string of 1–200 chars; the field is now `horarioJson` validated as the full structured object.)

#### Scenario: Validate price is positive

- GIVEN A PATCH request with price set to 0
- WHEN The validation logic processes the request
- THEN The request MUST be rejected with a validation error

#### Scenario: Validate price is a number

- GIVEN A PATCH request with price set to "abc"
- WHEN The validation logic processes the request
- THEN The request MUST be rejected with a validation error

#### Scenario: Validate nombre is non-empty when present

- GIVEN A PATCH request with `nombre = ""`
- WHEN The validation logic processes the request
- THEN The request MUST be rejected

#### Scenario: Validate URL format for URL fields

- GIVEN A PATCH request with any of `mapsEmbedUrl`, `socialInstagram`, `socialWhatsapp` set to a non-URL string
- WHEN The validation logic processes the request
- THEN The request MUST be rejected with a validation error for the offending field

#### Scenario: Validate horarioJson structure

- GIVEN A PATCH request with `horarioJson` missing one of the 7 required day keys
- WHEN The validation logic processes the request
- THEN The request MUST be rejected with a validation error on `horarioJson`

#### Scenario: Validate horarioJson time format

- GIVEN A PATCH request with `horarioJson.lun.apertura = "25:00"` (invalid HH:MM)
- WHEN The validation logic processes the request
- THEN The request MUST be rejected with a validation error on the offending time field

#### Scenario: Allow partial updates

- GIVEN A PATCH request with only `{ "nombre": "New Name" }`
- WHEN The validation logic processes the request
- THEN The request MUST be accepted and ONLY the `nombre` field MUST be updated in the DB

## ADDED Requirements

### Requirement: horarioJson response stability

The `horarioJson` field in the GET response MUST be a JSON object (with 7 day keys) when set, and JSON `null` when unset. The field MUST NEVER be returned as a string. Clients consuming the API MUST be able to rely on the type: object | null.

#### Scenario: horarioJson null on empty Gym

- GIVEN A Gym record with no schedule saved
- WHEN A GET request is made to /api/gym
- THEN `horarioJson` MUST be `null` in the response (NOT `{}`, NOT omitted, NOT an empty string)

#### Scenario: horarioJson preserves all 7 day keys

- GIVEN A Gym record with a saved schedule
- WHEN A GET request is made to /api/gym
- THEN the response MUST include all 7 keys (`lun`, `mar`, `mie`, `jue`, `vie`, `sab`, `dom`)
- AND any closed day MUST have `abierto: false, apertura: null, cierre: null`

---

## API Specification

### GET /api/gym

**Description**: Returns the singleton gym configuration

**Authentication**: None required

**Response 200**:
```json
{
  "id": "gym",
  "price": 45000,
  "nombre": "Titanium Gym",
  "horarioJson": {
    "lun": { "abierto": true,  "apertura": "08:00", "cierre": "22:00" },
    "mar": { "abierto": true,  "apertura": "08:00", "cierre": "22:00" },
    "mie": { "abierto": true,  "apertura": "08:00", "cierre": "22:00" },
    "jue": { "abierto": true,  "apertura": "08:00", "cierre": "22:00" },
    "vie": { "abierto": true,  "apertura": "08:00", "cierre": "22:00" },
    "sab": { "abierto": true,  "apertura": "09:00", "cierre": "14:00" },
    "dom": { "abierto": false, "apertura": null,     "cierre": null }
  },
  "direccion": "Av. Siempre Viva 742",
  "mapsEmbedUrl": "https://www.google.com/maps/embed?...",
  "socialInstagram": "https://instagram.com/titanium",
  "socialWhatsapp": "https://wa.me/5491112345678",
  "createdAt": "2026-06-10T10:00:00.000Z",
  "updatedAt": "2026-06-10T10:00:00.000Z"
}
```

Any display field MAY be `null`. `horarioJson`, when present, MUST be a JSON object — never a string.

**Response 500**:
```json
{
  "error": "Service temporarily unavailable. Please try again later."
}
```

### PATCH /api/gym

**Description**: Updates the gym configuration (price + display fields)

**Authentication**: Required (Admin only)

**Request Body** (all fields optional, at least one required):
```json
{
  "price": 50000,
  "nombre": "Titanium Gym",
  "horarioJson": {
    "lun": { "abierto": true,  "apertura": "08:00", "cierre": "22:00" },
    "mar": { "abierto": true,  "apertura": "08:00", "cierre": "22:00" },
    "mie": { "abierto": true,  "apertura": "08:00", "cierre": "22:00" },
    "jue": { "abierto": true,  "apertura": "08:00", "cierre": "22:00" },
    "vie": { "abierto": true,  "apertura": "08:00", "cierre": "22:00" },
    "sab": { "abierto": true,  "apertura": "09:00", "cierre": "14:00" },
    "dom": { "abierto": false, "apertura": null,     "cierre": null }
  },
  "direccion": "Av. Siempre Viva 742",
  "mapsEmbedUrl": "https://www.google.com/maps/embed?...",
  "socialInstagram": "https://instagram.com/titanium",
  "socialWhatsapp": "https://wa.me/5491112345678"
}
```

**Response 200**: Same shape as GET 200.

**Response 400** (Validation Error):
```json
{
  "error": "Validation failed",
  "details": {
    "price": ["Price must be a positive number"],
    "nombre": ["Name cannot be empty"],
    "socialInstagram": ["Invalid URL"],
    "horarioJson": ["horarioJson.lun.apertura: Invalid time format"]
  }
}
```

**Response 401** / **Response 403**: unchanged from previous spec.

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC1 | GET /api/gym returns 200 with gym object |
| AC2 | GET /api/gym auto-creates gym if not exists |
| AC3 | PATCH /api/gym updates price successfully for admin users |
| AC4 | PATCH /api/gym returns 401 for unauthenticated requests |
| AC5 | PATCH /api/gym returns 403 for non-admin authenticated users |
| AC6 | PATCH /api/gym validates price is positive number |
| AC7 | All responses follow consistent JSON format |
| AC8 | GET /api/gym response includes `horarioJson` (typed as object \| null) plus the five String display fields (nombre, direccion, mapsEmbedUrl, socialInstagram, socialWhatsapp), each nullable; the `horario` free-text field MUST NOT appear |
| AC9 | PATCH /api/gym accepts partial updates; rejects empty `nombre`, non-URL URL fields, malformed `horarioJson` (missing days, invalid time format) with HTTP 400 |
| AC10 | PATCH /api/gym accepts `{ "horarioJson": null }` and persists NULL (clear the schedule) |
