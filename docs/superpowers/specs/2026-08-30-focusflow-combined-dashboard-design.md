# FocusFlow Combined Dashboard Design

**Date:** 2026-08-30
**Status:** Approved for implementation planning

## Purpose

Build the first usable FocusFlow milestone: a combined student dashboard for weekly assignments and monthly personal finances. The milestone will use the existing React frontend, ASP.NET Core API, Entity Framework Core, and PostgreSQL database.

The product will retain a multi-user data model from the start. During this milestone, one seeded demo student will stand in for the signed-in user. Registration and authentication will be added later without changing the ownership model for assignments, expenses, or budgets.

## Goals

- Show a full-width Monday-to-Friday assignment planner for the selected week.
- Let the student create, view, edit, complete, and delete assignments.
- Show a compact monthly budget strip beneath the planner.
- Let the student set a monthly budget and create, view, edit, and delete expenses.
- Calculate spending totals, remaining budget, and category totals from persisted data.
- Ensure every query and mutation is scoped to the current user.
- Provide clear loading, empty, validation, and error states.
- Support desktop and mobile layouts.

## Non-goals

- Registration, login, password management, and account recovery.
- Multiple profiles in the interface during the demo-user milestone.
- Grade forecasting, assignment grade weights, or study-time estimation.
- Bank connections, transaction importing, recurring expenses, or multi-currency conversion.
- Notifications, email reminders, and calendar integrations.
- A full month-view school calendar.

## Approved Visual Direction

The dashboard uses the approved **full-width weekly planner with a compact budget strip**.

- A narrow left navigation rail contains the FocusFlow mark and primary navigation icons.
- The header greets the demo student and provides an **Add assignment** action.
- The main card shows five weekday columns for the selected Monday-to-Friday week.
- Assignment cards display the title, course, and due time using a subtle priority color.
- Empty weekdays show a quiet empty state.
- A thin reminder row identifies the next deadline without creating a large standalone card.
- A compact horizontal budget strip sits below the planner.
- The budget strip contains a donut chart, amount remaining, amount spent, category totals, and an **Add expense** action.
- On small screens, the week becomes horizontally scrollable and nonessential budget category detail collapses while the balance and action remain visible.

The brainstorming mockup is a temporary visual artifact and is not part of the production application.

## Product Behavior

### Weekly assignments

- The dashboard opens on the current local Monday-to-Friday week.
- Previous and next controls change the selected week without reloading the page.
- The assignment query includes the complete date range needed by the selected week.
- Weekend assignments do not appear as weekday columns in this milestone, but remain accessible through **View all assignments** and are eligible to appear in the next-deadline reminder.
- **Add assignment** opens a form with:
  - title, required;
  - course, required;
  - due date and time, required;
  - priority, required, with Low, Medium, and High values;
  - completion status, defaulting to incomplete;
  - notes, optional.
- Selecting an assignment opens the same form in edit mode and offers complete and delete actions.
- Delete requires confirmation.
- The next-deadline reminder uses the earliest incomplete assignment at or after the current time.

### Monthly finances

- The budget strip opens on the current calendar month.
- The student can set or update one budget amount for each year and month.
- Currency is CAD for this milestone and is formatted consistently in the UI.
- **Add expense** opens a form with:
  - title, required;
  - amount, required and greater than zero;
  - category, required;
  - date, required;
  - notes, optional.
- Default categories are Food, Transport, School, Entertainment, Housing, and Other.
- Category values are stored as text so custom categories can be introduced later without a database redesign.
- The donut chart and category totals use expenses whose dates fall within the displayed month.
- Remaining budget equals the configured monthly amount minus the month's total expenses. A negative remainder is displayed as an over-budget amount rather than clamped to zero.
- Existing expenses can be edited or deleted from the finances view; deletion requires confirmation.

## Architecture

### Frontend

The React application is divided into focused units:

- `DashboardPage` coordinates the selected week and month and composes the page.
- `Sidebar` and `DashboardHeader` provide navigation and page actions.
- `WeeklyPlanner` renders weekday columns and week navigation.
- `AssignmentCard` renders one assignment summary.
- `AssignmentForm` handles create and edit flows.
- `BudgetStrip` renders the monthly summary and category chart.
- `ExpenseForm` handles expense creation and editing.
- `ConfirmDialog`, `EmptyState`, and `ErrorState` provide shared interaction states.
- API modules isolate HTTP details for assignments, expenses, budgets, and finance summaries.

The donut chart will use CSS `conic-gradient`, avoiding a chart dependency for this single visualization.

### Backend

ASP.NET Core controllers will expose user-scoped assignment, expense, budget, and summary operations. Controllers will accept and return DTOs rather than binding Entity Framework entities directly.

An `ICurrentUserService` boundary will provide the active user's identifier. The initial implementation returns the configured seeded demo-user identifier. A future authentication milestone can replace that implementation with a claims-based version while leaving controller queries and data ownership unchanged.

The API will enable a development-only CORS policy for the configured Vite origin.

### Database

The existing `StudyTask` entity will gain:

- `Course`;
- `Priority`;
- `Notes`.

The existing `Expense` entity will gain `Notes`.

A `MonthlyBudget` entity will contain:

- `Id`;
- `Year`;
- `Month`;
- `Amount`;
- `UserId` and its `User` relationship.

The database will enforce one monthly budget per `(UserId, Year, Month)` combination. Assignment due dates and expense dates will be indexed with `UserId` because dashboard queries filter by owner and date range.

One demo user will be seeded with a stable identifier. Demo assignments, expenses, and a budget may be seeded only in development so the approved dashboard has meaningful first-run content.

## API Shape

All routes derive the active user from `ICurrentUserService`; the client does not submit or select `UserId`.

### Assignments

- `GET /api/tasks?from=<iso-date>&to=<iso-date>` returns assignments in the inclusive date range.
- `GET /api/tasks/{id}` returns one owned assignment.
- `POST /api/tasks` creates an assignment.
- `PUT /api/tasks/{id}` updates an owned assignment.
- `DELETE /api/tasks/{id}` deletes an owned assignment.

### Expenses

- `GET /api/expenses?year=<year>&month=<month>` returns owned expenses for a month.
- `GET /api/expenses/{id}` returns one owned expense.
- `POST /api/expenses` creates an expense.
- `PUT /api/expenses/{id}` updates an owned expense.
- `DELETE /api/expenses/{id}` deletes an owned expense.

### Budgets and summaries

- `GET /api/budgets/{year}/{month}` returns the owned monthly budget or an explicit no-budget result.
- `PUT /api/budgets/{year}/{month}` creates or replaces the owned monthly budget amount.
- `GET /api/finance/summary?year=<year>&month=<month>` returns the budget amount, total spent, remaining amount, over-budget state, and totals grouped by category.

Dates are exchanged as ISO 8601 values. Money values use JSON numbers backed by .NET `decimal` and PostgreSQL numeric columns.

## Data Flow

1. On load, the frontend calculates the current week and month.
2. Assignment and finance-summary requests run independently so one section can render even if the other fails.
3. The API obtains the current demo-user identifier and adds it to every database query.
4. The weekly query returns assignment DTOs for the requested range.
5. The finance-summary query aggregates owned expenses for the requested month and combines them with the owned monthly budget.
6. After a successful assignment mutation, only assignment data and the next-deadline reminder refresh.
7. After a successful expense or budget mutation, only the finance summary and relevant expense list refresh.

Form state remains in memory when a request fails, allowing the student to correct or retry without re-entering data.

## Validation and Error Handling

- The frontend validates required fields before submission and displays messages next to the relevant controls.
- The API independently validates all DTOs and returns standard validation-problem responses.
- Assignment titles and courses must not be blank.
- Expense amounts and monthly budget amounts must be greater than zero.
- Year and month route values must describe a valid calendar month.
- Requests for records owned by another user return `404`, avoiding disclosure that the record exists.
- Conflicting monthly-budget writes return a deterministic validation or conflict response rather than creating duplicates.
- Each dashboard section has its own loading, empty, and retry state.
- A global unexpected-error boundary prevents a rendering error from leaving a blank application.
- Successful create, update, and delete actions show brief confirmation feedback.

## Testing Strategy

### Backend

- Unit tests cover finance-summary calculations, including zero spending and over-budget results.
- Controller or integration tests cover date filtering and CRUD validation.
- Ownership tests verify that one user cannot read, change, or delete another user's records.
- Persistence tests verify the unique monthly-budget constraint.

### Frontend

- Component tests cover weekday placement, empty days, priority styling, and next-deadline selection.
- Form tests cover required fields, positive money values, retained values after request failure, and successful submission.
- Budget-strip tests cover totals, category rendering, no-budget state, and over-budget state.
- Interaction tests cover previous/next week navigation and section-level retry behavior.

### End-to-end and visual checks

- A smoke path creates an assignment and expense and verifies that both dashboard sections update.
- The application is checked at desktop and mobile widths against the approved mockup.
- The frontend build, frontend test suite, backend build, and backend test suite must pass before the milestone is considered complete.

## Future Authentication Migration

The later accounts milestone will add registration, login, secure password handling, and claims-based identity. It will replace the demo implementation of `ICurrentUserService` with a claims-backed implementation and remove development demo seeding. Existing `UserId` relationships, controller ownership filters, and database records remain valid, so this migration does not require rebuilding the assignment or finance features.
