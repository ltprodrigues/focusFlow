# FocusFlow

FocusFlow helps students organize assignments, deadlines, and personal expenses in one dashboard. The combined dashboard includes a five-weekday assignment planner, a compact monthly budget summary, and editable expense history backed by ASP.NET Core and PostgreSQL.

## Tech stack

- React and Vite
- ASP.NET Core Web API
- PostgreSQL with Entity Framework Core

## Local setup with Google sign-in

### 1. Configure PostgreSQL

Create a local PostgreSQL database named `focusflow_db`. Keep its password and all Google credentials in .NET User Secrets; never add them to `appsettings*.json` or Git.

From the repository root, initialize and set the backend secrets (replace every placeholder):

```powershell
dotnet user-secrets init --project backend
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=focusflow_db;Username=YOUR_POSTGRES_USER;Password=YOUR_POSTGRES_PASSWORD" --project backend
dotnet user-secrets set "Authentication:Google:ClientId" "YOUR_GOOGLE_CLIENT_ID" --project backend
dotnet user-secrets set "Authentication:Google:ClientSecret" "YOUR_GOOGLE_CLIENT_SECRET" --project backend
```

`dotnet user-secrets list --project backend` shows the configured keys. Do not paste its output into issues, commits, screenshots, or chat because it reveals secret values. If a real credential was ever tracked, rotate it; deleting it from the current file does not erase Git history.

### 2. Create the Google OAuth client

In [Google Cloud Console](https://console.cloud.google.com/), configure the OAuth consent screen and create an OAuth client with application type **Web application**. During testing, add your Google address under the consent screen's test users. Configure:

- Authorized JavaScript origin: `http://localhost:5173`
- Authorized redirect URI: `http://localhost:5062/signin-google`

The values must match exactly, including scheme, port, and callback path. Copy the generated client ID and client secret into User Secrets using the commands above.

### 3. Apply database migrations deliberately

Migrations do not run automatically on Development startup. This prevents a pending cleanup migration from deleting legacy demo data merely because Rider restarted. Inspect pending migrations before applying them:

```powershell
dotnet ef migrations list --project backend
dotnet ef migrations script --project backend --idempotent
dotnet ef database update --project backend
```

The final Google-only migration removes the old demo identity and its owned rows under the exact predicate `Id = 1 AND Email = 'demo@focusflow.local'`. Back up the database and verify the target/counts before applying it. Do not run `database update` for that migration until you intend to remove those demo records.

### 4. Start the API in Rider or a terminal

In Rider, select the `backend: http` launch profile and verify the environment is `Development`. The equivalent terminal command is:

```powershell
dotnet run --project backend --launch-profile http
```

The API runs at `http://localhost:5062`. If it stops with “Google authentication is not configured,” set both Google keys in User Secrets. If it reports a database connection error, recheck the `focusflow_db` connection string and PostgreSQL service.

### 5. Start the frontend

In a second terminal:

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`). The development API permits that configured origin only; production does not enable this policy.

Choose **Sign in with Google**. Google returns to the backend callback, the backend creates or refreshes the FocusFlow profile, and then redirects to the dashboard. The browser receives an HTTP-only application cookie; Google access tokens are not stored in React or browser storage.

## Deployment configuration

Use HTTPS for both frontend and API. Create a separate Google **Web application** OAuth client (or add exact production entries) with the production frontend origin and backend callback, for example `https://api.example.com/signin-google`. Configure secrets in the hosting provider's secret manager:

- `ConnectionStrings__DefaultConnection`
- `Authentication__Google__ClientId`
- `Authentication__Google__ClientSecret`
- `Authentication__Google__FrontendUrl=https://app.example.com`
- `Cors__Origins__0=https://app.example.com`
- Frontend build value `VITE_API_URL=https://api.example.com`

Run EF migrations as a deliberate deployment step before starting the new API version. Production cookies are `HttpOnly`, `Secure`, and `SameSite=Lax`. Unsafe API requests also require the in-memory `X-FocusFlow-CSRF` token returned by `/api/auth/me`.

## Budget and expenses

Use **Edit budget** in the monthly spending strip to set the selected month's budget. Amounts are entered and displayed in Canadian dollars (CAD). Expenses support Food, Transport, School, Entertainment, Housing, and Other categories. **Add expense** creates a record; select a row under **This month's expenses** to edit or delete it. The budget remainder, donut, and category totals refresh after changes.

## Verification

Run backend tests and build from the repository root:

```powershell
dotnet test backend.Tests/backend.Tests.csproj
dotnet build backend/backend.csproj --configuration Release --no-restore
dotnet ef migrations list --project backend
```

Run frontend checks from `frontend`:

```powershell
npm test
npm run lint
npm run build
```

For a persisted-data smoke test, sign in with one Google account, add an assignment and expense, refresh, and confirm both remain. Change the budget and verify the remainder and donut update; edit and delete the expense and verify the totals update. Sign out, use a second Google account, and confirm it cannot see the first account's data. Check the browser console and API output for unhandled errors.
