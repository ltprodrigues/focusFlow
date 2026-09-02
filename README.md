# FocusFlow

FocusFlow helps students organize assignments, deadlines, and personal expenses in one dashboard. The combined dashboard includes a five-weekday assignment planner, a compact monthly budget summary, and editable expense history backed by ASP.NET Core and PostgreSQL.

## Tech stack

- React and Vite
- ASP.NET Core Web API
- PostgreSQL with Entity Framework Core

## Local setup

### 1. Configure PostgreSQL

Create a local PostgreSQL database for FocusFlow. Set the `ConnectionStrings__DefaultConnection` environment variable to a PostgreSQL connection string for that database. Keep local credentials in environment variables or user secrets; do not commit them.

For example, set it only in the current PowerShell session before starting the API:

```powershell
$env:ConnectionStrings__DefaultConnection = "Host=localhost;Port=5432;Database=focusflow;Username=YOUR_USER;Password=YOUR_PASSWORD"
```

If a real credential was previously stored in a tracked configuration file, rotate that database password; removing it from the current file does not remove it from Git history.

Apply the migrations from the repository root:

```powershell
dotnet ef database update --project backend
```

### 2. Start the API

```powershell
dotnet run --project backend --launch-profile http
```

The development API runs at `http://localhost:5062`. On startup it applies pending migrations and idempotently prepares demo user ID `1`. The demo month follows the configured `America/Toronto` student calendar. The demo includes two assignments, a CAD 650 current-month budget, and representative Food, Transport, School, and Other expenses. Existing demo rows are preserved and missing demo rows are added without duplicating data. This development-only identity scopes assignments, budgets, and expenses until account authentication is added.

### 3. Start the frontend

In a second terminal:

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`). The development API permits that configured origin only; production does not enable this policy.

## Budget and expenses

Use **Edit budget** in the monthly spending strip to set the selected month's budget. Amounts are entered and displayed in Canadian dollars (CAD). Expenses support Food, Transport, School, Entertainment, Housing, and Other categories. **Add expense** creates a record; select a row under **This month's expenses** to edit or delete it. The budget remainder, donut, and category totals refresh after changes.

## Verification

Run backend tests and build from the repository root:

```powershell
dotnet test backend.Tests/backend.Tests.csproj
dotnet build backend/backend.csproj --configuration Release --no-restore
dotnet ef migrations list --project backend
dotnet ef database update --project backend
```

Run frontend checks from `frontend`:

```powershell
npm test
npm run lint
npm run build
```

For a persisted-data smoke test, start both applications, add an assignment and expense, refresh the browser, and confirm both remain. Then change the budget and verify the remainder and donut update; edit and delete the expense and verify the totals update. Check the browser console and API output for unhandled errors.
