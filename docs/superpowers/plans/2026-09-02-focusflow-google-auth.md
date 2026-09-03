# FocusFlow Google Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the demo identity with Google-only accounts whose assignments, budgets, and expenses are isolated by an authenticated server session.

**Architecture:** ASP.NET Core owns the Google OAuth authorization-code flow and issues an HTTP-only application cookie. React bootstraps the current profile and antiforgery token from the API, then keeps the existing assignment and finance sections behind an authenticated shell. Schema changes are split into a safe additive migration and a separately confirmed destructive cleanup migration so ordinary development runs cannot delete demo data prematurely.

**Tech Stack:** .NET 10, ASP.NET Core Cookie/Google authentication, ASP.NET Core antiforgery, EF Core 10.0.8, PostgreSQL, React 19, Vite 8, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-09-02-focusflow-google-auth-design.md`

## Global Constraints

- Google is the only sign-in method; any Google account may create a profile.
- The backend owns OAuth and sessions. React must never store a Google access token or application JWT.
- Session cookies are HTTP-only, `SameSite=Lax`, and `Secure` outside local HTTP development.
- All assignment and finance controllers require authentication and retain owner predicates.
- Unsafe cookie-authenticated API requests require an antiforgery header.
- Request DTOs never accept `UserId`.
- OAuth client secrets, database credentials, cookies, and tokens never enter tracked files, reports, or logs.
- Preserve the user's existing uncommitted `UserSecretsId` addition in `backend/backend.csproj`; normalize its BOM only if the same file is intentionally committed.
- Do not modify or stage the unrelated untracked `global.json`.
- Do not apply the destructive demo-cleanup migration until the controller has backed up and inspected the local database and the user has explicitly confirmed deletion at action time.
- Exact demo cleanup predicate: `Id = 1 AND Email = 'demo@focusflow.local'`; never delete a nonmatching user.

## File structure

### Backend

- `backend/Models/User.cs`: Google identity and profile fields.
- `backend/Auth/GoogleProfile.cs`: normalized provider profile input.
- `backend/Auth/IGoogleProfileService.cs`: profile upsert boundary.
- `backend/Auth/GoogleProfileService.cs`: safe create/update by Google subject.
- `backend/Auth/GoogleAuthEvents.cs`: validates provider claims and adds internal user claim.
- `backend/Auth/AuthClaimTypes.cs`: internal user-ID claim name.
- `backend/Services/CurrentUserService.cs`: reads the authenticated internal ID.
- `backend/Controllers/AuthController.cs`: login, current profile/CSRF bootstrap, and logout.
- `backend/DTOs/CurrentUserDto.cs`: authenticated profile contract.
- `backend/Filters/AntiforgeryValidationFilter.cs`: validates unsafe authenticated API calls.
- `backend/Program.cs`: cookie/Google/CORS/antiforgery registration and demo-seed removal.
- `backend/Migrations/*AddGoogleIdentity.cs`: additive identity schema.
- `backend/Migrations/*RemoveDemoIdentity.cs`: separately confirmed cleanup and final constraints.

### Frontend

- `frontend/src/api/auth.js`: login URL, `/api/auth/me`, and logout.
- `frontend/src/auth/AuthContext.jsx`: session bootstrap and `401` transition boundary.
- `frontend/src/components/auth/LoginScreen.jsx`: anonymous state and Google action.
- `frontend/src/components/auth/AuthLoadingScreen.jsx`: bootstrap state.
- `frontend/src/components/layout/ProfileMenu.jsx`: real profile and logout action.
- `frontend/src/components/layout/DashboardHeader.jsx`: real first name greeting.
- `frontend/src/components/layout/Sidebar.jsx`: profile picture with initials fallback.
- `frontend/src/api/http.js`: cookie credentials, antiforgery header, auth-expired notification.
- `frontend/src/main.jsx`: authenticated provider around the app.

---

### Task 1: Additive Google identity model and migration

**Files:**
- Modify: `backend/backend.csproj`
- Modify: `backend/Models/User.cs`
- Modify: `backend/Data/ApplicationDbContext.cs`
- Create: `backend.Tests/GoogleIdentityModelTests.cs`
- Create: `backend/Migrations/<generated>_AddGoogleIdentity.cs`
- Modify: `backend/Migrations/ApplicationDbContextModelSnapshot.cs`

**Interfaces:**
- Produces: nullable transitional `User.GoogleSubject`, `User.PictureUrl`, and `User.TimeZone` fields.
- Produces: unique filtered index for non-null Google subjects and a unique email index; stored emails are normalized to lowercase before persistence.
- Preserves: `PasswordHash` until the separately confirmed destructive migration.

- [ ] **Step 1: Write failing model metadata tests**

```csharp
[Fact]
public void User_HasUniqueGoogleSubjectIndex()
{
    using var db = TestDbContextFactory.Create();
    var user = db.Model.FindEntityType(typeof(User))!;
    var index = Assert.Single(user.GetIndexes(), x =>
        x.Properties.Select(p => p.Name).SequenceEqual(["GoogleSubject"]));
    Assert.True(index.IsUnique);
    Assert.NotNull(index.GetFilter());
}

[Fact]
public void User_TimeZone_DefaultsToToronto()
{
    Assert.Equal("America/Toronto", new User().TimeZone);
}
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `dotnet test backend.Tests/backend.Tests.csproj -c Release --no-restore --filter GoogleIdentityModelTests`

Expected: FAIL because the Google profile fields and indexes do not exist.

- [ ] **Step 3: Add the transitional model and mappings**

```csharp
public string? GoogleSubject { get; set; }
public string? PictureUrl { get; set; }
public string TimeZone { get; set; } = "America/Toronto";
```

Configure maximum lengths (`GoogleSubject` 255, email 320, name 160, picture URL 2048, time zone 100), a unique filtered Google-subject index, and a unique email index. `GoogleProfileService` will lowercase provider email before persistence. Keep `PasswordHash` during this task so the existing demo row remains valid.

- [ ] **Step 4: Generate and inspect the additive migration**

Run: `dotnet ef migrations add AddGoogleIdentity --project backend`

Run: `dotnet ef migrations script --project backend --idempotent`

Expected: profile columns and filtered unique indexes are added; no `DELETE`, `DROP COLUMN`, or demo-data mutation appears.

- [ ] **Step 5: Run backend verification**

Run: `dotnet test backend.Tests/backend.Tests.csproj -c Release --no-restore`

Run: `dotnet build backend/backend.csproj -c Release --no-restore`

- [ ] **Step 6: Commit exact files**

```powershell
git add backend/backend.csproj backend/Models/User.cs backend/Data/ApplicationDbContext.cs backend/Migrations backend.Tests/GoogleIdentityModelTests.cs
git commit -m "feat: add Google identity schema"
```

### Task 2: Google profile synchronization and server authentication

**Files:**
- Modify: `backend/backend.csproj`
- Create: `backend/Auth/AuthClaimTypes.cs`
- Create: `backend/Auth/GoogleProfile.cs`
- Create: `backend/Auth/IGoogleProfileService.cs`
- Create: `backend/Auth/GoogleProfileService.cs`
- Create: `backend/Auth/GoogleAuthEvents.cs`
- Create: `backend.Tests/GoogleProfileServiceTests.cs`
- Create: `backend.Tests/GoogleAuthEventsTests.cs`
- Modify: `backend/Program.cs`
- Modify: `backend/appsettings.Development.json`

**Interfaces:**
- Produces: `Task<User> UpsertAsync(GoogleProfile profile, string timeZone, CancellationToken cancellationToken)`.
- Produces: application-cookie principal claim `AuthClaimTypes.UserId`.
- Consumes: `Authentication:Google:ClientId`, `Authentication:Google:ClientSecret`, callback path, frontend base URL, and default time zone.

- [ ] **Step 1: Add failing profile synchronization tests**

```csharp
[Fact]
public async Task UpsertAsync_CreatesOnceByGoogleSubjectAndRefreshesProfile()
{
    await using var db = TestDbContextFactory.Create();
    var service = new GoogleProfileService(db);
    await service.UpsertAsync(new("google-123", "student@example.com", "Student", null), "America/Toronto", default);
    await service.UpsertAsync(new("google-123", "student@example.com", "Updated Student", "https://example.test/photo"), "America/Toronto", default);
    var user = Assert.Single(db.Users);
    Assert.Equal("Updated Student", user.Name);
    Assert.Equal("https://example.test/photo", user.PictureUrl);
}
```

Also cover missing subject/email, duplicate email with a different subject, cancellation, and time-zone validation/fallback.

- [ ] **Step 2: Verify RED**

Run: `dotnet test backend.Tests/backend.Tests.csproj -c Release --no-restore --filter "GoogleProfileServiceTests|GoogleAuthEventsTests"`

Expected: FAIL because the auth services do not exist.

- [ ] **Step 3: Add the Google provider package and authentication services**

Run `dotnet add backend/backend.csproj package Microsoft.AspNetCore.Authentication.Google --version 10.0.8`. Configure cookie authentication as the default authenticate/sign-in scheme and Google as the challenge scheme. Validate required Client ID/Secret at startup without logging their values.

```csharp
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultSignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = GoogleDefaults.AuthenticationScheme;
})
.AddCookie(options =>
{
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
    options.Events.OnRedirectToLogin = context =>
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    };
})
.AddGoogle(/* configured options and GoogleAuthEvents */);
```

- [ ] **Step 4: Implement provider claim validation and profile upsert**

Require Google `sub` and email claims, normalize the email, validate the requested time zone, call `IGoogleProfileService`, and replace/add the internal integer user-ID claim. Redirect remote failures to the configured frontend `/login?error=google` without provider details.

- [ ] **Step 5: Run focused and full backend verification**

Run: `dotnet test backend.Tests/backend.Tests.csproj -c Release --no-restore --filter "GoogleProfileServiceTests|GoogleAuthEventsTests"`

Run: `dotnet test backend.Tests/backend.Tests.csproj -c Release --no-restore`

- [ ] **Step 6: Commit**

```powershell
git add backend/backend.csproj backend/Auth backend/Program.cs backend/appsettings.Development.json backend.Tests/GoogleProfileServiceTests.cs backend.Tests/GoogleAuthEventsTests.cs
git commit -m "feat: add Google cookie authentication"
```

### Task 3: Auth endpoints, claims current user, authorization, and CSRF

**Files:**
- Create: `backend/DTOs/CurrentUserDto.cs`
- Create: `backend/Controllers/AuthController.cs`
- Create: `backend/Services/CurrentUserService.cs`
- Delete: `backend/Services/DemoCurrentUserService.cs`
- Create: `backend/Filters/AntiforgeryValidationFilter.cs`
- Modify: `backend/Services/ICurrentUserService.cs`
- Modify: `backend/Controllers/TasksController.cs`
- Modify: `backend/Controllers/ExpensesController.cs`
- Modify: `backend/Controllers/BudgetsController.cs`
- Modify: `backend/Controllers/FinanceController.cs`
- Modify: `backend/Program.cs`
- Create: `backend.Tests/AuthControllerTests.cs`
- Create: `backend.Tests/CurrentUserServiceTests.cs`
- Create: `backend.Tests/AuthenticatedApiTests.cs`

**Interfaces:**
- Produces: `GET /api/auth/google/login`, `GET /api/auth/me`, and `POST /api/auth/logout`.
- Produces: `CurrentUserDto(int Id, string Name, string Email, string? PictureUrl, string TimeZone, string AntiforgeryToken)`.
- Produces: claims-backed `ICurrentUserService.UserId`.

- [ ] **Step 1: Write failing HTTP authentication tests**

```csharp
[Fact]
public async Task Tasks_WithoutCookie_ReturnsUnauthorized()
{
    using var client = factory.CreateClient();
    var response = await client.GetAsync("/api/tasks");
    Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
}

[Fact]
public async Task Me_ReturnsProfileAndAntiforgeryTokenForAuthenticatedUser()
{
    using var client = factory.CreateAuthenticatedClient(userId: 7);
    var profile = await client.GetFromJsonAsync<CurrentUserDto>("/api/auth/me");
    Assert.Equal(7, profile!.Id);
    Assert.False(string.IsNullOrWhiteSpace(profile.AntiforgeryToken));
}
```

Add tests proving two authenticated users cannot read/update/delete each other's tasks, expenses, budgets, or finance summaries. Test unsafe requests without the antiforgery header return `400`, while the header from `/api/auth/me` succeeds.

- [ ] **Step 2: Verify RED**

Run: `dotnet test backend.Tests/backend.Tests.csproj -c Release --no-restore --filter "AuthControllerTests|CurrentUserServiceTests|AuthenticatedApiTests"`

- [ ] **Step 3: Implement claims current user and authorize controllers**

`CurrentUserService` reads `AuthClaimTypes.UserId` from `IHttpContextAccessor.HttpContext.User`, parses a positive integer, and throws a controlled unauthorized exception when absent/invalid. Add `[Authorize]` to all four data controllers; retain every existing owner predicate.

- [ ] **Step 4: Implement login, profile bootstrap, and logout**

The login endpoint accepts only a local `returnUrl`, validates/falls back the time zone, and challenges Google with a configured frontend redirect. `/me` loads the authenticated user and returns an antiforgery request token. Logout validates antiforgery, signs out the cookie, and returns `204`.

- [ ] **Step 5: Enforce antiforgery only on unsafe cookie API methods**

Register antiforgery with header `X-FocusFlow-CSRF`. The async authorization filter skips safe `GET`, `HEAD`, and `OPTIONS` requests and validates authenticated `POST`, `PUT`, and `DELETE` requests. Return a validation response without exposing token details.

- [ ] **Step 6: Remove demo identity startup behavior**

Remove `DevelopmentDataSeeder` invocation and `DemoCurrentUserService` registration. Keep database migration at startup only in Development. Update old host tests to use the test authentication scheme rather than demo configuration.

- [ ] **Step 7: Verify and commit**

Run: `dotnet test backend.Tests/backend.Tests.csproj -c Release --no-restore`

Run: `dotnet build backend/backend.csproj -c Release --no-restore`

```powershell
git add backend/Controllers backend/DTOs backend/Filters backend/Services backend/Program.cs backend.Tests
git commit -m "feat: protect APIs with authenticated sessions"
```

### Task 4: Frontend authentication client and provider

**Files:**
- Create: `frontend/src/api/auth.js`
- Create: `frontend/src/api/auth.test.js`
- Create: `frontend/src/auth/AuthContext.jsx`
- Create: `frontend/src/auth/AuthContext.test.jsx`
- Modify: `frontend/src/api/http.js`
- Modify: `frontend/src/api/tasks.test.js`
- Modify: `frontend/src/api/expenses.test.js`
- Modify: `frontend/src/api/finance.test.js`

**Interfaces:**
- Produces: `getCurrentUser()`, `logout(csrfToken)`, and `buildGoogleLoginUrl(returnUrl)`.
- Produces: `useAuth()` with `status`, `user`, `csrfToken`, `login`, `logout`, and `handleUnauthorized`.
- Modifies: `request()` to send cookies and `X-FocusFlow-CSRF` on unsafe methods.

- [ ] **Step 1: Write failing auth-client and provider tests**

```js
it('builds the Google login URL with browser timezone and local return path', () => {
  expect(buildGoogleLoginUrl('/')).toContain('/api/auth/google/login?')
  expect(decodeURIComponent(buildGoogleLoginUrl('/'))).toContain('timeZone=America/Toronto')
})

it('boots into anonymous state after a 401', async () => {
  getCurrentUser.mockRejectedValue(new ApiError(401))
  render(<AuthProvider><Probe /></AuthProvider>)
  expect(await screen.findByText('anonymous')).toBeInTheDocument()
})
```

Cover loading/authenticated/anonymous/error states, logout success/failure, and a later API `401` resetting authenticated state.

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/api/auth.test.js src/auth/AuthContext.test.jsx`

- [ ] **Step 3: Implement credentialed HTTP and CSRF memory**

Every fetch uses `credentials: 'include'`. Unsafe methods require the current in-memory CSRF token and send `X-FocusFlow-CSRF`. Do not persist tokens in localStorage/sessionStorage. Provide a narrow callback from the HTTP layer for `401` so `AuthProvider` can clear its profile.

- [ ] **Step 4: Implement auth client/provider**

Bootstrap once from `/api/auth/me`, keep the returned antiforgery token in provider state, navigate to the backend Google login URL, and clear state only after logout settles or a confirmed `401` occurs. Validate `returnUrl` as a local path in the client as defense in depth.

- [ ] **Step 5: Update existing API tests and run frontend verification**

Run: `npm test`

Run: `npm run lint`

Run: `npm run build`

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/api frontend/src/auth
git commit -m "feat: add frontend authentication state"
```

### Task 5: Login screen and authenticated profile shell

**Files:**
- Create: `frontend/src/components/auth/LoginScreen.jsx`
- Create: `frontend/src/components/auth/LoginScreen.test.jsx`
- Create: `frontend/src/components/auth/AuthLoadingScreen.jsx`
- Create: `frontend/src/components/layout/ProfileMenu.jsx`
- Create: `frontend/src/components/layout/ProfileMenu.test.jsx`
- Modify: `frontend/src/components/layout/DashboardHeader.jsx`
- Modify: `frontend/src/components/layout/Sidebar.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/App.test.jsx`
- Modify: `frontend/src/main.jsx`
- Modify: `frontend/src/styles/dashboard.css`

**Interfaces:**
- Consumes: `useAuth()` from Task 4.
- Produces: anonymous login screen, authenticated dashboard profile, image fallback, and logout menu.

- [ ] **Step 1: Write failing shell tests**

```jsx
it('shows Google login without mounting private dashboard requests', () => {
  renderAppWithAuth({ status: 'anonymous' })
  expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument()
  expect(listTasks).not.toHaveBeenCalled()
})

it('shows the authenticated Google profile', () => {
  renderAppWithAuth({ status: 'authenticated', user: maya })
  expect(screen.getByRole('heading', { name: 'Good morning, Maya' })).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'Maya Singh' })).toHaveAttribute('src', maya.pictureUrl)
})
```

Cover loading, provider failure/retry, broken image initials fallback, keyboard-accessible profile menu, logout pending/error, and `401` transition.

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/components/auth/LoginScreen.test.jsx src/components/layout/ProfileMenu.test.jsx src/App.test.jsx`

- [ ] **Step 3: Implement auth-gated app composition**

Do not mount assignment or finance hooks until authentication succeeds. Preserve independent dashboard section loading after success. Login uses normal top-level navigation to the backend OAuth endpoint.

- [ ] **Step 4: Replace hard-coded profile UI**

Use the first nonblank token from `user.name` in the greeting. Render `pictureUrl` with a descriptive alt; on image error, render sanitized initials. The menu exposes email and **Sign out**, restores focus when closed, and locks dismissal while logout is pending.

- [ ] **Step 5: Add responsive styling and verify**

At 390px the login action, profile control, and existing primary dashboard actions remain visible and keyboard reachable. At 1440px the approved combined dashboard layout remains unchanged.

Run: `npm test`

Run: `npm run lint`

Run: `npm run build`

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/components/auth frontend/src/components/layout frontend/src/App.jsx frontend/src/App.test.jsx frontend/src/main.jsx frontend/src/styles/dashboard.css
git commit -m "feat: add Google authenticated dashboard shell"
```

### Task 6: Security integration, deployment documentation, and confirmed demo cleanup

**Files:**
- Create: `backend.Tests/GoogleAuthIntegrationTests.cs`
- Modify: `backend.Tests/TaskRequestValidationTests.cs`
- Modify: `backend/Data/DevelopmentDataSeeder.cs` (delete after final migration verification)
- Modify: `backend/Models/User.cs`
- Modify: `backend/Data/ApplicationDbContext.cs`
- Create: `backend/Migrations/<generated>_RemoveDemoIdentity.cs`
- Modify: `backend/Migrations/ApplicationDbContextModelSnapshot.cs`
- Modify: `README.md`
- Modify: `frontend/.env.example`

**Interfaces:**
- Finalizes: required `GoogleSubject`, removed `PasswordHash`, no demo seeder.
- Documents: Google Cloud local and deployment configuration, Rider startup, backup, migration, and smoke verification.

- [ ] **Step 1: Add full security integration tests**

Use a fake authentication scheme and real HTTP pipeline. Prove anonymous `401`, authenticated profile bootstrap, CSRF rejection/acceptance, logout, two-user isolation for every aggregate, no open redirect, and no sensitive provider values in error responses/log fixtures.

- [ ] **Step 2: Run integration tests and verify GREEN before destructive work**

Run: `dotnet test backend.Tests/backend.Tests.csproj -c Release --no-restore --filter "GoogleAuthIntegrationTests|TaskRequestValidationTests"`

- [ ] **Step 3: Generate the final cleanup migration without applying it**

Remove `PasswordHash`, make `GoogleSubject` required for the final model, and delete the obsolete seeder source/tests. Generate `RemoveDemoIdentity`, then edit its data operations so child rows and the user are removed only under the exact joined predicate `Users.Id = 1 AND Users.Email = 'demo@focusflow.local'`. The `Down` migration restores schema only; it must not fabricate deleted personal data.

Run: `dotnet ef migrations script <AddGoogleIdentityMigration> <RemoveDemoIdentityMigration> --project backend`

Expected: the SQL contains the exact demo predicate, scoped child deletes, final non-null/index constraints, and no broad user delete.

- [ ] **Step 4: Stop for the mandatory destructive confirmation**

Do not proceed automatically. Report the exact local database target without its password, show demo user/task/expense/budget counts, confirm a backup file exists, and ask the user to explicitly authorize applying the cleanup migration.

- [ ] **Step 5: After confirmation, back up and apply locally**

Create a timestamped `pg_dump` outside tracked source, verify the command exits zero and the file is nonempty, then run:

```powershell
dotnet ef database update --project backend
```

Verify the exact demo identity is absent and no nonmatching user was deleted. Report that deletion is permanent from the live database but recoverable from the named backup.

- [ ] **Step 6: Document local Google/Rider and deployment setup**

Document Google Cloud **Web application** credentials, development origin `http://localhost:5173`, callback `http://localhost:5062/signin-google`, User Secrets commands, strict Vite port, consent-screen testing users, production HTTPS origins/callbacks, secret-manager configuration, cookie/CSRF behavior, and credential rotation. Include no real IDs or secrets.

- [ ] **Step 7: Run fresh repository and live verification**

Run:

```powershell
dotnet test backend.Tests/backend.Tests.csproj -c Release --no-restore
dotnet build backend/backend.csproj -c Release --no-restore
dotnet ef migrations script --project backend --idempotent
```

From `frontend` run `npm test`, `npm run lint`, and `npm run build`.

Start both apps and manually verify Google login, profile rendering, logout, session expiry, assignment/expense/budget persistence, a second Google account seeing no first-account data, and no browser console/API log errors.

- [ ] **Step 8: Commit**

```powershell
git add backend backend.Tests frontend/.env.example README.md
git commit -m "feat: complete Google account integration"
```

The controller must inspect staged files to ensure no User Secrets store, backup, `global.json`, token, client ID, client secret, cookie, or database password is included.
