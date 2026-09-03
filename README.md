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
The goal of this project is to build a real-world productivity platform while applying fullstack development concepts including REST APIs, authentication, database management, and responsive UI design.

## Tech Stack

### Frontend
- React (planned)

### Backend
- ASP.NET Core Web API
- Entity Framework Core

### Database
- PostgreSQL

### Tools
- Git & GitHub
- Rider
- Swagger/OpenAPI

The development API runs at `http://localhost:5062`. On startup it applies pending migrations and idempotently prepares demo user ID `1`. The demo month follows the configured `America/Toronto` student calendar. The demo includes two assignments, a CAD 650 current-month budget, and representative Food, Transport, School, and Other expenses. Existing demo rows are preserved and missing demo rows are added without duplicating data. This development-only identity scopes assignments, budgets, and expenses until account authentication is added.

## Main Features

### Study Management
- Create study tasks
- Track deadlines
- Mark tasks as completed
- View upcoming responsibilities

### Expense Management
- Add expenses
- Categorize spending
- Track monthly expenses
- View financial summaries

### Dashboard
- Study overview
- Expense overview
- Charts and analytics

### User Management
- User authentication (planned)
- Personal user data


## Current Progress

### Completed
- [x] Created project repository
- [x] Set up ASP.NET Core Web API
- [x] Configured project solution
- [x] Connected PostgreSQL database
- [x] Added Entity Framework Core
- [x] Created database migrations
- [x] Created backend models:
  - User
  - Expense
  - StudyTask
- [x] Created ApplicationDbContext
- [x] Added Swagger documentation
- [x] Created Expense API Controller
- [x] Added DTO structure

```powershell
dotnet test backend.Tests/backend.Tests.csproj
dotnet build backend/backend.csproj --configuration Release --no-restore
dotnet ef migrations list --project backend
dotnet ef database update --project backend
```

### In Progress
- [ ] Complete Expense API testing
- [ ] Create StudyTask API Controller
- [ ] Add authentication system


### Upcoming
- [ ] Build React frontend
- [ ] Connect frontend with API
- [ ] Create dashboard UI
- [ ] Add charts and analytics
- [ ] Deploy application


## Project Status

Currently in development.
