# FocusFlow

FocusFlow helps students organize assignments, deadlines, and personal expenses in one dashboard. The current development milestone includes the weekly assignment planner backed by ASP.NET Core and PostgreSQL.

## Tech stack

- React and Vite
- ASP.NET Core Web API
- PostgreSQL with Entity Framework Core

## Local setup

### 1. Configure PostgreSQL

Create a local PostgreSQL database for FocusFlow. Set the `ConnectionStrings__DefaultConnection` environment variable to a PostgreSQL connection string for that database. Keep local credentials in environment variables or user secrets; do not commit them.

Apply the migrations from the repository root:

```powershell
dotnet ef database update --project backend
```

### 2. Start the API

```powershell
dotnet run --project backend --launch-profile http
```

The development API runs at `http://localhost:5062`. On startup it applies pending migrations and creates demo user ID `1` if that user does not already exist. This development-only identity scopes assignments until account authentication is added.

### 3. Start the frontend

In a second terminal:

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`). The development API permits that configured origin only; production does not enable this policy.

## Verification

Run backend tests and build from the repository root:

```powershell
dotnet test backend.Tests/backend.Tests.csproj
dotnet build backend/backend.csproj --no-restore
```

Run frontend checks from `frontend`:

```powershell
npm test
npm run lint
npm run build
```
