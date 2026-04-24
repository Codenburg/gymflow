# Auth Specification

## Purpose

This specification defines the authentication and authorization requirements for the application, including user roles, session management, and admin access controls.

---

## Requirements

### Requirement: User Role Field

The User model in the database MUST have a `role` field with type `Role` enum values: `ADMIN`, `TRAINER`, or `USER`.

The system MUST store user role in the database for authorization purposes.

#### Scenario: User record has role field

- GIVEN the Prisma schema is updated with role field
- WHEN a User record is queried
- THEN the record MUST include a `role` field
- AND the field MUST be of type `Role` enum

#### Scenario: Role enum values

- GIVEN the Role enum is defined in Prisma schema
- WHEN the schema is parsed
- THEN the enum MUST have values: `ADMIN`, `TRAINER`, `USER`
- AND the default value MUST be `USER`

#### Scenario: Seed creates admin with ADMIN role

- GIVEN the seed script creates admin users
- WHEN the database is seeded
- THEN admin users MUST have `role: ADMIN`
- AND trainer users MUST have `role: TRAINER`
- AND regular users MUST have `role: USER`

### Requirement: Role-Based Session

The session MUST include the user's role from the database.

#### Scenario: Session contains role field

- GIVEN a user is authenticated
- WHEN the session is retrieved
- THEN `session.user.role` MUST be present
- AND the value MUST match the user's role in the database

#### Scenario: Admin session has ADMIN role

- GIVEN an admin user with `role: ADMIN` logs in
- WHEN `auth.api.getSession()` is called
- THEN `session.user.role === "ADMIN"`

#### Scenario: Trainer session has TRAINER role

- GIVEN a trainer user with `role: TRAINER` logs in
- WHEN `auth.api.getSession()` is called
- THEN `session.user.role === "TRAINER"`

### Requirement: Server Actions Role Verification

All server actions that require admin or trainer privileges MUST verify both authentication and role by passing headers to `auth.api.getSession()`.

The system MUST fail gracefully when session verification fails.

#### Scenario: verifyAdmin receives valid headers

- GIVEN a server action calls verifyAdmin with headers
- WHEN auth.api.getSession({ headers }) is executed
- THEN the session MUST be validated using the provided headers
- AND the action MUST proceed if user.role is ADMIN

#### Scenario: verifyAdminOrTrainer receives valid headers

- GIVEN a server action calls verifyAdminOrTrainer with headers
- WHEN auth.api.getSession({ headers }) is executed
- THEN the session MUST be validated using the provided headers
- AND the action MUST proceed if user.role is ADMIN or TRAINER

#### Scenario: verifyAdmin receives no headers

- GIVEN a server action calls verifyAdmin without headers
- WHEN auth.api.getSession() is executed
- THEN the session check MUST fail (cookies not sent)
- AND the action MUST return unauthorized error

#### Scenario: User is authenticated but not admin or trainer

- GIVEN a user is logged in with role=USER
- WHEN they call an admin-or-trainer-only server action
- THEN the action MUST return "No tienes permisos de administrador"
- AND the operation MUST NOT be executed

### Requirement: Middleware Auth and Role Protection

The middleware MUST protect `/admin` routes by verifying session existence and role before allowing access.

Unauthenticated users MUST be redirected to `/admin/login`.
Users with role=USER MUST be redirected to the homepage.

#### Scenario: Authenticated admin or trainer accesses /admin

- GIVEN a user has a valid session cookie with role ADMIN or TRAINER
- WHEN they navigate to /admin
- THEN the middleware MUST allow the request to proceed
- AND the page MUST render normally

#### Scenario: Unauthenticated user accesses /admin

- GIVEN no session cookie exists
- WHEN they navigate to /admin
- THEN the middleware MUST redirect to /admin/login
- AND the original request MUST NOT be processed

#### Scenario: Non-admin-trainer user accesses /admin

- GIVEN a user has a valid session cookie with role USER
- WHEN they navigate to /admin
- THEN the middleware MUST redirect to the homepage
- AND the admin panel MUST NOT be accessible

### Requirement: Prisma User Model

The User model MUST include a role field for authorization.

#### Scenario: User model includes role enum

- GIVEN Prisma schema is configured
- WHEN the schema is parsed
- THEN User model MUST have `role Role @default(USER)`
- AND Role enum MUST have values ADMIN, TRAINER, USER

---

## Better Auth Username Plugin Configuration

The application uses the Better Auth username plugin to allow login with DNI (username) instead of email.

### Requirement: Account Model for Username Authentication

The Account model MUST be configured correctly for the Better Auth username plugin to query credentials properly.

#### Scenario: Username login queries account with correct providerId

- GIVEN a user attempts to sign in with username
- WHEN Better Auth's username plugin queries the account
- THEN the query looks for `providerId === 'credential'` (NOT 'username')
- AND `accountId` contains the username (DNI)

#### Scenario: Account creation for username plugin

- GIVEN a new user is created with username (DNI) for login
- WHEN the seed script or signup creates the Account record
- THEN the Account MUST have:
  - `accountId` = the username (DNI)
  - `providerId` = 'credential'
  - `providerType` = 'credential'
  - `password` = bcrypt hashed password

#### Scenario: Admin users have correct Account configuration

- GIVEN an admin user with DNI '11111111' is created
- WHEN the seed script runs
- THEN the Account record MUST be created with:
  ```typescript
  {
    userId: user.id,
    accountId: '11111111',      // DNI as accountId
    providerId: 'credential',    // NOT 'username'!
    providerType: 'credential',
    password: bcrypt_hash
  }
  ```

### Requirement: Better Auth Configuration

The Better Auth server configuration MUST include the username plugin.

#### Scenario: Auth server includes username plugin

- GIVEN the auth server is configured
- WHEN the configuration is parsed
- THEN the plugins array MUST include `username()` from 'better-auth/plugins'
- AND the client MUST include `usernameClient()` from 'better-auth/client/plugins'

#### Scenario: Username sign-in endpoint available

- GIVEN a POST request is made to `/api/auth/sign-in/username`
- WHEN the request contains valid username and password
- THEN the response MUST include `{ token: string, user: User }`
- AND a session cookie MUST be set

### Requirement: Login Form Uses Username Sign-In

The admin login form MUST use `signIn.username()` from the Better Auth client.

#### Scenario: Login form submits to username endpoint

- GIVEN a user enters DNI and password in the login form
- WHEN the form is submitted
- THEN the client calls `authClient.signIn.username({ username: dni, password })`
- AND on success, redirects to `/admin`

#### Scenario: Login displays user-friendly error

- GIVEN a user enters invalid credentials
- WHEN the username sign-in fails
- THEN the UI MUST display "DNI o contraseña incorrectos"
- AND the user MUST remain on the login page

### Requirement: Public Sign-Up Disabled

Public sign-up via `/api/auth/sign-up` MUST be disabled. Users can only be created by admins via the trainer management UI.

#### Scenario: Public sign-up returns 403

- GIVEN a POST request is made to `/api/auth/sign-up`
- WHEN the request contains sign-up data
- THEN the response MUST return 403 Forbidden
- AND no new user account MUST be created

#### Scenario: Admin can create trainers via management UI

- GIVEN an authenticated admin accesses `/admin/trainers`
- WHEN the admin creates a new trainer
- THEN a new user with role TRAINER MUST be created
- AND the trainer can log in with their credentials

---

## User Model Structure

### Data Model: User

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | @id @default(uuid()) | User identifier |
| name | String | required | User's display name |
| dni | String | @unique | DNI (used for display only) |
| username | String? | @unique | Username for login (same as DNI) |
| email | String? | @unique | Optional email |
| emailVerified | Boolean | @default(false) | Email verification status |
| role | Role | @default(USER) | User role: ADMIN, TRAINER, or USER |
| banned | Boolean | @default(false) | Ban status |
| createdAt | DateTime | @default(now()) | Creation timestamp |
| updatedAt | DateTime | @updatedAt | Last update timestamp |

### Data Model: Role Enum

| Value | Description |
|-------|-------------|
| ADMIN | Full admin access to all admin panel features |
| TRAINER | Restricted access: only Rutinas and Feriados |
| USER | Standard user (cannot access admin panel) |

### Data Model: Account (for Better Auth)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | @id @default(uuid()) | Account identifier |
| userId | String | required | Foreign key to User |
| accountId | String | required | The username (DNI) - used for credential lookup |
| providerId | String | required | Must be 'credential' for username plugin |
| providerType | String | required | Must be 'credential' |
| password | String? | nullable | Bcrypt hashed password |
| createdAt | DateTime | @default(now()) | Creation timestamp |
| updatedAt | DateTime | @updatedAt | Last update timestamp |

### Data Model: Session (for Better Auth)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | @id @default(uuid()) | Session identifier |
| userId | String | required, indexed | Foreign key to User |
| token | String | @unique | Session token |
| expiresAt | DateTime | required | Expiration timestamp |
| ipAddress | String? | nullable | Client IP |
| userAgent | String? | nullable | Client user agent |
| createdAt | DateTime | @default(now()) | Creation timestamp |
| updatedAt | DateTime | @updatedAt | Last update timestamp |
