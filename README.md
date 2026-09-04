# FocusFlow

FocusFlow is a full-stack student productivity app for organizing assignments, deadlines, monthly budgets, and personal expenses in one private dashboard.

## Main features

- Five-weekday assignment planner with priorities and completion tracking
- Upcoming deadline overview and complete assignment list
- Monthly CAD budget, remaining balance, and category chart
- Expense creation, editing, deletion, and monthly history
- Google-only accounts with isolated assignments and financial data
- Responsive desktop and mobile dashboard

## Tech stack

- React and Vite
- ASP.NET Core Web API and Entity Framework Core
- PostgreSQL
- Google OAuth 2.0 with a server-owned HTTP-only session cookie
- Rider, Git, GitHub, and Swagger/OpenAPI

## Local setup with Google sign-in

### 1. Configure PostgreSQL and User Secrets

Create a local PostgreSQL database named `focusflow_db`. Keep its password and all Google credentials in .NET User Secrets; never add them to `appsettings*.json` or Git.

From the repository root, initialize and set the backend secrets, replacing every placeholder:

```powershell
dotnet user-secrets init --project backend
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=focusflow_db;Username=YOUR_POSTGRES_USER;Password=YOUR_POSTGRES_PASSWORD" --project backend
dotnet user-secrets set "Authentication:Google:ClientId" "YOUR_GOOGLE_CLIENT_ID" --project backend
dotnet user-secrets set "Authentication:Google:ClientSecret" "YOUR_GOOGLE_CLIENT_SECRET" --project backend
```

`dotnet user-secrets list --project backend` displays configured keys and values. Do not paste its output into issues, commits, screenshots, or chat. If a real credential was ever tracked, rotate it; deleting it from the current file does not erase Git history.

### 2. Create the Google OAuth client

In [Google Cloud Console](https://console.cloud.google.com/), configure the OAuth consent screen and create an OAuth client with application type **Web application**. During testing, add your Google address under the consent screen's test users. Configure these exact local values:

- Authorized JavaScript origin: `http://localhost:5173`
- Authorized redirect URI: `http://localhost:5062/signin-google`

Copy the generated client ID and client secret into User Secrets using the commands above.

### 3. Apply database migrations deliberately

Migrations do not run automatically on Development startup. Inspect pending migrations before applying them:

```powershell
dotnet ef migrations list --project backend
dotnet ef migrations script --project backend --idempotent
dotnet ef database update --project backend
```

The final Google-only migration removes the legacy demo identity and its owned rows only under the exact predicate `Id = 1 AND Email = 'demo@focusflow.local'`. Back up and inspect a database before applying that migration.

### 4. Start the API

In Rider, select the `backend: http` launch profile and verify the environment is `Development`. The equivalent terminal command is:

```powershell
dotnet run --project backend --launch-profile http
```

The API runs at `http://localhost:5062`. If it reports that Google authentication is not configured, set both Google keys in User Secrets. For database connection errors, recheck the `focusflow_db` connection string and PostgreSQL service.

### 5. Start the frontend

In a second terminal:

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173` and choose **Sign in with Google**. Google returns to the backend callback, which creates or refreshes the FocusFlow profile and redirects to the dashboard. Google access tokens are not stored in React or browser storage.

## Deployment configuration

Use HTTPS for both frontend and API. Create a production Google **Web application** OAuth client with exact production frontend and backend callback entries, such as `https://api.example.com/signin-google`. Configure these values in the hosting provider's secret manager:

- `ConnectionStrings__DefaultConnection`
- `Authentication__Google__ClientId`
- `Authentication__Google__ClientSecret`
- `Authentication__Google__FrontendUrl=https://app.example.com`
- `Cors__Origins__0=https://app.example.com`
- Frontend build value `VITE_API_URL=https://api.example.com`

Run EF migrations as a deliberate deployment step before starting the new API version. Production cookies are `HttpOnly`, `Secure`, and `SameSite=Lax`. Unsafe API requests also require the in-memory `X-FocusFlow-CSRF` token returned by `/api/auth/me`.

## Verification

From the repository root:

```powershell
dotnet test backend.Tests/backend.Tests.csproj
dotnet build backend/backend.csproj --configuration Release --no-restore
dotnet ef migrations list --project backend
```

From `frontend`:

```powershell
npm test
npm run lint
npm run build
```

For a persisted-data smoke test, sign in with one Google account, add an assignment and expense, refresh, and confirm both remain. Change the budget and verify its totals; edit and delete the expense. Sign out, use a second Google account, and confirm it cannot see the first account's data.

## Project status

The assignment dashboard, finance dashboard, Google authentication, owner isolation, CSRF protection, responsive UI, and automated backend/frontend suites are implemented. Deployment infrastructure remains environment-specific.
