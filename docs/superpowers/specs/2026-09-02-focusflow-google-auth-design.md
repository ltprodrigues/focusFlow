# FocusFlow Google Authentication Design

**Date:** 2026-09-02  
**Status:** Proposed for implementation  
**Depends on:** `2026-08-30-focusflow-combined-dashboard-design.md`

## Goal

Replace the development-only demo identity with real Google-only accounts. Any Google account may sign in, and each user can access only their own assignments, monthly budgets, and expenses. The app must remain straightforward to run locally and configurable for a later public deployment without committing credentials.

## Product decisions

- Google is the only sign-in method.
- Any Google account may create a FocusFlow profile.
- A profile is created automatically on first sign-in from the Google subject identifier, name, email, and picture.
- The browser's IANA time-zone identifier is captured during sign-in and stored for calendar behavior.
- A later settings screen may allow changing display name and time zone; it is not part of this milestone.
- The existing demo user and all of its assignments, budgets, and expenses will be permanently deleted during migration after a backup and an explicit final confirmation.
- No demo data will be recreated after authentication is enabled.

## Authentication architecture

ASP.NET Core owns the OAuth authorization-code flow and the application session.

1. The unauthenticated React shell displays **Sign in with Google**.
2. The browser detects its time zone with `Intl.DateTimeFormat().resolvedOptions().timeZone` and navigates to `GET /api/auth/google/login?timeZone=<iana>&returnUrl=/`.
3. The backend validates the time zone and local return path, stores them in protected OAuth properties, and challenges the Google handler.
4. Google redirects to the backend callback at `/signin-google`.
5. The backend identifies the account by Google's immutable `sub` claim. It creates the user on first sign-in or refreshes the user's name, email, and picture on later sign-ins.
6. The backend issues an application cookie and redirects to the configured frontend base URL plus the validated local return path.
7. React calls `GET /api/auth/me` to bootstrap the authenticated profile.
8. `POST /api/auth/logout` removes the application session and returns `204`.

The browser never stores a Google access token or an application JWT. The session cookie is HTTP-only, `SameSite=Lax`, and `Secure` outside local HTTP development. OAuth state/correlation is handled by ASP.NET Core's Google middleware.

## Backend design

### User model

The `User` entity will contain:

- `Id`: internal database key.
- `GoogleSubject`: required immutable Google subject, unique.
- `Email`: required, unique and normalized for display/contact; not used as the external identity key.
- `Name`: current Google display name.
- `PictureUrl`: optional Google profile image.
- `TimeZone`: validated IANA/Windows-compatible time-zone identifier.
- `CreatedAt`: UTC creation timestamp.

`PasswordHash` is removed because password authentication is not supported.

### Current-user boundary

`DemoCurrentUserService` is replaced by an HTTP claims-backed `CurrentUserService`. It reads the internal FocusFlow user ID from the authenticated application principal. Missing or invalid identity is rejected; it never falls back to user `1`.

All assignment and finance controllers receive `[Authorize]`. Existing owner predicates remain mandatory defense in depth. Request bodies continue to exclude `UserId`.

### Auth endpoints

- `GET /api/auth/google/login`: begins the Google challenge.
- `GET /api/auth/me`: returns `{ id, name, email, pictureUrl, timeZone }` for the signed-in user; otherwise `401`.
- `POST /api/auth/logout`: signs out the application cookie and returns `204`.

The OAuth callback is middleware-owned. Redirect targets must be local paths to prevent open redirects. Invalid time zones fall back to the configured default (`America/Toronto`) rather than accepting arbitrary values.

### Cookie and cross-origin policy

The application cookie is HTTP-only and essential, with `SameSite=Lax`. It is `Secure` in production. It has a bounded sliding lifetime. Development CORS permits only the configured frontend origin, allows credentials, headers, and methods. Production deployment should serve frontend and API from the same site where possible; otherwise its exact frontend origin must be configured.

Cookie-authenticated mutation endpoints require CSRF protection. The backend issues a readable antiforgery token through the authenticated bootstrap flow, and the frontend sends it in a dedicated header for `POST`, `PUT`, and `DELETE` requests. CORS alone is not treated as CSRF protection.

## Database migration and destructive cleanup

The migration adds Google identity/profile fields and unique indexes, removes `PasswordHash`, and deletes only the exact development identity (`Id = 1` and `Email = demo@focusflow.local`) with its owned rows. Child rows are explicitly deleted or removed through verified cascade relationships before the user row.

Before applying this migration to the local database:

1. Create a PostgreSQL backup.
2. Verify the targeted demo user and owned-row counts.
3. Ask the user for final destructive confirmation.
4. Apply the migration and verify that no demo identity remains.

The migration must not delete any row when the exact demo identity predicate does not match.

`DevelopmentDataSeeder` and its startup call are removed. New Google users begin with empty assignments and finances.

## Frontend design

An authentication provider owns three states: `loading`, `authenticated`, and `anonymous`.

- `loading`: a short full-shell loading state while `/api/auth/me` resolves.
- `anonymous`: a focused sign-in screen with the Google action and retryable failure copy.
- `authenticated`: the existing dashboard, supplied with the real profile.

`DashboardHeader` uses the profile name. `Sidebar` uses the Google picture when available and accessible initials otherwise. A profile menu exposes **Sign out**.

The shared HTTP client sends `credentials: 'include'`. It attaches the antiforgery header to mutations. A `401` clears authenticated UI state and returns to the sign-in screen without hiding a more specific non-authentication API error.

Assignment and finance loading/error states remain independent after authentication succeeds.

## Error handling

- Cancelled Google consent returns to the sign-in screen with a retry action.
- Provider or callback failures do not create a partial user session.
- A duplicate email with a different Google subject is rejected and logged without exposing account details.
- Missing Google subject or email claims reject sign-in.
- Invalid/expired cookies return `401` and reset the frontend auth state.
- Profile image failure falls back to initials.
- Auth logs must not include tokens, secrets, cookies, or full provider payloads.

## Configuration and local development

Tracked configuration contains no credentials. Required values are supplied through environment variables or .NET User Secrets:

- `Authentication:Google:ClientId`
- `Authentication:Google:ClientSecret`
- `Authentication:Google:CallbackPath` (default `/signin-google`)
- `Frontend:BaseUrl` (development default `http://localhost:5173`)
- `Authentication:DefaultTimeZone` (default `America/Toronto`)

The Google Cloud OAuth client is a **Web application**. Local configuration uses:

- Authorized JavaScript origin: `http://localhost:5173`
- Authorized redirect URI: `http://localhost:5062/signin-google`

The project contains a non-secret `UserSecretsId`. A developer runs:

```powershell
dotnet user-secrets set "Authentication:Google:ClientId" "YOUR_CLIENT_ID" --project backend/backend.csproj
dotnet user-secrets set "Authentication:Google:ClientSecret" "YOUR_CLIENT_SECRET" --project backend/backend.csproj
dotnet user-secrets set "Frontend:BaseUrl" "http://localhost:5173" --project backend/backend.csproj
```

The existing PostgreSQL connection string remains in User Secrets. Run the backend with launch profile `http`, then Vite on strict port 5173. Deployment supplies the same settings through the host's secret manager and registers the deployed HTTPS callback/origin in Google Cloud.

## Testing

Backend tests use a test authentication scheme and synthetic claims; they do not contact Google.

- Challenge endpoint validates time zone and return path.
- Callback/user synchronization creates once and updates safe profile fields.
- `/api/auth/me` and logout behavior.
- Antiforgery enforcement for cookie-authenticated mutations.
- Missing/invalid claims and duplicate identity conflict behavior.
- Two authenticated users cannot read or mutate each other's assignments or finances.
- Migration SQL targets only the exact demo identity and preserves unrelated users.

Frontend tests cover auth bootstrap states, login URL/time-zone construction, authenticated profile display, image fallback, logout, `401` transitions, credentials/antiforgery headers, and preservation of independent dashboard errors.

Final verification includes full backend/frontend tests, lint/build, migration inspection, local PostgreSQL migration, and a manual Google sign-in/logout/data-isolation smoke path.

## Acceptance criteria

- Any Google account can sign in and receives a distinct FocusFlow user.
- Sessions use secure server-issued cookies; no provider token is stored by React.
- All assignments, budgets, expenses, and summaries are isolated by authenticated user.
- Name, email, picture, and time zone populate automatically on first login.
- Logout and expired-session behavior return the user to the sign-in screen.
- The exact demo identity and its data are removed only after backup and final confirmation.
- Local Rider setup and future deployment configuration are documented without secrets.
