# API Specification - Gym Configuration

## Purpose

This spec defines the backend API endpoints required to expose the singleton Gym configuration for read and update operations.

---

## Requirements

### Requirement: GET /api/gym Endpoint

The system MUST provide a read-only endpoint to retrieve the current gym configuration. The response MUST include the six new display fields (`nombre`, `horario`, `direccion`, `mapsEmbedUrl`, `socialInstagram`, `socialWhatsapp`) in addition to the existing `price`, `createdAt`, `updatedAt`.

#### Scenario: Fetch gym configuration successfully

- GIVEN A Gym record exists with id "gym" in the database
- WHEN A GET request is made to /api/gym
- THEN The response MUST return HTTP status 200
- AND The response body MUST contain the Gym object with id, price, createdAt, updatedAt
- AND The response body MUST also include nombre, horario, direccion, mapsEmbedUrl, socialInstagram, socialWhatsapp (any MAY be null)

#### Scenario: Fetch gym when database is empty

- GIVEN No Gym record exists in the database
- WHEN A GET request is made to /api/gym
- THEN The response MUST return HTTP status 200
- AND The response MUST return a default Gym object with id "gym" and price 0 (auto-create)
- AND all new display fields MUST default to null

#### Scenario: Fetch gym with partial fields

- GIVEN Only `nombre` and `horario` are set; other display fields are null
- WHEN A GET request is made to /api/gym
- THEN The response MUST include nombre and horario with their values
- AND null fields MUST be JSON `null` (not omitted, not empty string)

### Requirement: PATCH /api/gym Endpoint

The system MUST provide an authenticated endpoint to update gym configuration. The endpoint MUST accept any subset of the six new display fields plus `price`, validate via Zod, and reject invalid input with HTTP 400 and field-level error details.

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
- WHEN A PATCH is made with `{ "nombre": "New", "horario": "Lun-Vie 7-22" }`
- THEN The response MUST return HTTP 200
- AND the response body MUST contain the updated Gym object
- AND the DB MUST persist the new nombre and horario

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

#### Scenario: Update gym price with invalid input

- GIVEN A user is authenticated as admin
- AND A Gym record exists with id "gym"
- WHEN A PATCH request is made to /api/gym with body `{ "price": -100 }`
- THEN The response MUST return HTTP status 400
- AND The response body MUST contain validation error details

#### Scenario: Update without authentication

- GIVEN No authenticated session
- WHEN A PATCH is made to /api/gym
- THEN The response MUST return HTTP 401 with an error message

#### Scenario: Update without admin privileges

- GIVEN An authenticated non-admin user
- WHEN A PATCH is made to /api/gym
- THEN The response MUST return HTTP 403 with an error message

#### Scenario: Update gym without authentication

- GIVEN No authenticated session exists
- WHEN A PATCH request is made to /api/gym
- THEN The response MUST return HTTP status 401
- AND The response body MUST contain an error message

#### Scenario: Update gym without admin privileges

- GIVEN A user is authenticated but is NOT an admin
- WHEN A PATCH request is made to /api/gym
- THEN The response MUST return HTTP status 403
- AND The response body MUST contain an error message indicating insufficient permissions

### Requirement: Input Validation

The system MUST validate all PATCH input via Zod: positive `price` (existing), non-empty `nombre` when present, valid URL format for `mapsEmbedUrl`, `socialInstagram`, `socialWhatsapp` when present, and free-text for `horario` and `direccion`.

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

#### Scenario: Allow partial updates

- GIVEN A PATCH request with only `{ "nombre": "New Name" }`
- WHEN The validation logic processes the request
- THEN The request MUST be accepted and ONLY the `nombre` field MUST be updated in the DB

### Requirement: Response Format

The API MUST return consistent response formats for success and error scenarios.

#### Scenario: Successful response format

- GIVEN A successful GET or PATCH request
- WHEN The API responds
- THEN The response MUST include appropriate HTTP status code
- AND The response body MUST be valid JSON

#### Scenario: Error response format

- GIVEN An error occurs during request processing
- WHEN The API responds with an error
- THEN The response MUST include appropriate HTTP status code (4xx or 5xx)
- AND The response body MUST contain an "error" field with a descriptive message

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
  "horario": "Lun-Vie 7:00-22:00",
  "direccion": "Av. Siempre Viva 742",
  "mapsEmbedUrl": "https://www.google.com/maps/embed?...",
  "socialInstagram": "https://instagram.com/titanium",
  "socialWhatsapp": "https://wa.me/5491112345678",
  "createdAt": "2026-03-17T10:00:00.000Z",
  "updatedAt": "2026-03-17T10:00:00.000Z"
}
```

Any display field MAY be `null`.

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
  "horario": "Lun-Vie 7:00-22:00",
  "direccion": "Av. Siempre Viva 742",
  "mapsEmbedUrl": "https://www.google.com/maps/embed?...",
  "socialInstagram": "https://instagram.com/titanium",
  "socialWhatsapp": "https://wa.me/5491112345678"
}
```

**Response 200**:
```json
{
  "id": "gym",
  "price": 50000,
  "nombre": "Titanium Gym",
  "horario": "Lun-Vie 7:00-22:00",
  "direccion": "Av. Siempre Viva 742",
  "mapsEmbedUrl": "https://www.google.com/maps/embed?...",
  "socialInstagram": "https://instagram.com/titanium",
  "socialWhatsapp": "https://wa.me/5491112345678",
  "createdAt": "2026-03-17T10:00:00.000Z",
  "updatedAt": "2026-03-17T12:00:00.000Z"
}
```

**Response 400** (Validation Error):
```json
{
  "error": "Validation failed",
  "details": {
    "price": ["Price must be a positive number"],
    "nombre": ["Name cannot be empty"],
    "socialInstagram": ["Invalid URL"]
  }
}
```

**Response 401** (Unauthorized):
```json
{
  "error": "Debes iniciar sesión"
}
```

**Response 403** (Forbidden):
```json
{
  "error": "No tienes permisos de administrador"
}
```

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
| AC8 | GET /api/gym response includes six new display fields (nombre, horario, direccion, mapsEmbedUrl, socialInstagram, socialWhatsapp), each nullable |
| AC9 | PATCH /api/gym accepts partial updates of display fields; rejects empty `nombre`, non-URL URL fields with HTTP 400 |
