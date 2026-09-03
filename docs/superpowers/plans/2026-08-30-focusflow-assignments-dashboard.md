# FocusFlow Assignments Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a tested, user-scoped assignment API and the approved full-width weekly planner using the seeded demo student.

**Architecture:** ASP.NET Core exposes DTO-based assignment endpoints whose Entity Framework queries are filtered through `ICurrentUserService`. React owns the selected week, fetches assignments through a small API module, and composes focused planner and form components inside the approved dashboard shell.

**Tech Stack:** .NET 10, ASP.NET Core, EF Core 10.0.8, PostgreSQL, React 19, Vite 8, Vitest, Testing Library, CSS

**Spec:** `docs/superpowers/specs/2026-08-30-focusflow-combined-dashboard-design.md`

## Global Constraints

- Preserve the existing `UserId` relationship on every assignment.
- The browser never supplies `UserId`; `ICurrentUserService` supplies it server-side.
- Use one seeded demo student until claims-based authentication is implemented.
- The primary dashboard view is Monday through Friday; weekend assignments remain available through the all-assignments query and next-deadline calculation.
- Assignment fields are title, course, due date/time, priority, completion status, and optional notes.
- Do not modify or stage the existing untracked `global.json`.
- Keep `.superpowers/` mockup artifacts untracked.

## File Structure

### Backend

- `backend/Services/ICurrentUserService.cs`: current-user boundary shared by all controllers.
- `backend/Services/DemoCurrentUserService.cs`: configured demo-user implementation.
- `backend/Models/StudyTaskPriority.cs`: Low, Medium, High values.
- `backend/Models/StudyTask.cs`: persisted assignment fields and owner relationship.
- `backend/DTOs/StudyTaskDto.cs`: assignment response contract.
- `backend/DTOs/UpsertStudyTaskDto.cs`: validated create/update request contract.
- `backend/Controllers/TasksController.cs`: owned assignment CRUD and date-range filtering.
- `backend/Data/ApplicationDbContext.cs`: indexes and demo-user seed.
- `backend/Migrations/<timestamp>_AddAssignmentDetails.cs`: generated schema change.
- `backend.Tests/`: xUnit tests, test database factory, and fake current user.

### Frontend

- `frontend/src/api/http.js`: shared JSON request and problem-response handling.
- `frontend/src/api/tasks.js`: assignment endpoint functions.
- `frontend/src/utils/week.js`: local week-range and weekday helpers.
- `frontend/src/components/layout/Sidebar.jsx`: navigation rail.
- `frontend/src/components/layout/DashboardHeader.jsx`: greeting and add action.
- `frontend/src/components/assignments/WeeklyPlanner.jsx`: weekday grid and navigation.
- `frontend/src/components/assignments/AssignmentCard.jsx`: one assignment summary.
- `frontend/src/components/assignments/AssignmentForm.jsx`: create/edit dialog.
- `frontend/src/components/shared/`: dialog, confirmation, empty, and error states.
- `frontend/src/App.jsx`: assignment dashboard orchestration.
- `frontend/src/styles/`: tokens, layout, planner, and dialog styles.
- `frontend/src/test/`: Vitest setup and reusable fixtures.

---

### Task 1: Backend test foundation and current-user boundary

**Files:**
- Create: `backend.Tests/backend.Tests.csproj`
- Create: `backend.Tests/TestDbContextFactory.cs`
- Create: `backend.Tests/FakeCurrentUserService.cs`
- Create: `backend.Tests/DemoCurrentUserServiceTests.cs`
- Create: `backend/Services/ICurrentUserService.cs`
- Create: `backend/Services/DemoCurrentUserService.cs`
- Modify: `backend/Program.cs`
- Modify: `focusFlow.slnx`
- Modify: `backend/appsettings.Development.json`

**Interfaces:**
- Produces: `ICurrentUserService.UserId : int`
- Produces: `FakeCurrentUserService(int userId)` for controller tests.

- [ ] **Step 1: Scaffold the test project and add references**

Run:

```powershell
dotnet new xunit -n backend.Tests -f net10.0
dotnet add backend.Tests/backend.Tests.csproj reference backend/backend.csproj
dotnet add backend.Tests/backend.Tests.csproj package Microsoft.EntityFrameworkCore.InMemory --version 10.0.8
dotnet sln focusFlow.slnx add backend.Tests/backend.Tests.csproj
```

Expected: `backend.Tests` restores successfully and appears in the solution.

- [ ] **Step 2: Write the failing current-user test**

```csharp
using backend.Services;
using Microsoft.Extensions.Configuration;

public class DemoCurrentUserServiceTests
{
    [Fact]
    public void UserId_UsesConfiguredDemoUser()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["DemoUser:Id"] = "7"
            }).Build();

        var service = new DemoCurrentUserService(config);

        Assert.Equal(7, service.UserId);
    }
}
```

- [ ] **Step 3: Run the test and verify the expected failure**

Run: `dotnet test backend.Tests/backend.Tests.csproj --filter DemoCurrentUserServiceTests`

Expected: FAIL because `backend.Services` and `DemoCurrentUserService` do not exist.

- [ ] **Step 4: Implement the boundary, fake, and test database factory**

```csharp
namespace backend.Services;

public interface ICurrentUserService
{
    int UserId { get; }
}

public sealed class DemoCurrentUserService(IConfiguration configuration)
    : ICurrentUserService
{
    public int UserId { get; } = configuration.GetValue<int>("DemoUser:Id");
}
```

```csharp
public sealed class FakeCurrentUserService(int userId) : ICurrentUserService
{
    public int UserId { get; set; } = userId;
}
```

```csharp
public static class TestDbContextFactory
{
    public static ApplicationDbContext Create()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }
}
```

Register `DemoCurrentUserService` as a scoped `ICurrentUserService` in `Program.cs` and add `{ "DemoUser": { "Id": 1 } }` to development settings.

- [ ] **Step 5: Run the focused and full backend tests**

Run: `dotnet test backend.Tests/backend.Tests.csproj`

Expected: PASS with zero failed tests.

- [ ] **Step 6: Commit**

```powershell
git add backend.Tests backend/Services backend/Program.cs backend/appsettings.Development.json focusFlow.slnx
git commit -m "test: add current user service foundation"
```

### Task 2: Assignment model, contracts, mapping, and migration

**Files:**
- Create: `backend/Models/StudyTaskPriority.cs`
- Modify: `backend/Models/StudyTask.cs`
- Create: `backend/DTOs/StudyTaskDto.cs`
- Create: `backend/DTOs/UpsertStudyTaskDto.cs`
- Create: `backend/Mappings/StudyTaskMappings.cs`
- Modify: `backend/Data/ApplicationDbContext.cs`
- Create: `backend.Tests/StudyTaskMappingsTests.cs`
- Create: `backend/Migrations/<generated>_AddAssignmentDetails.cs`

**Interfaces:**
- Produces: `StudyTaskDto(int Id, string Title, string Course, string? Notes, DateTime DueDate, StudyTaskPriority Priority, bool IsCompleted)`.
- Produces: `StudyTaskMappings.ToDto(StudyTask task)`.
- Consumes: `StudyTask.UserId` from the existing model.

- [ ] **Step 1: Write the failing mapping test**

```csharp
[Fact]
public void ToDto_CopiesAssignmentFields()
{
    var task = new StudyTask
    {
        Id = 9, Title = "Essay", Course = "English", Notes = "Cite sources",
        DueDate = new DateTime(2026, 8, 24, 16, 0, 0, DateTimeKind.Utc),
        Priority = StudyTaskPriority.High, IsCompleted = false, UserId = 1
    };

    var dto = task.ToDto();

    Assert.Equal("English", dto.Course);
    Assert.Equal(StudyTaskPriority.High, dto.Priority);
    Assert.Equal("Cite sources", dto.Notes);
}
```

- [ ] **Step 2: Verify the mapping test fails**

Run: `dotnet test backend.Tests/backend.Tests.csproj --filter StudyTaskMappingsTests`

Expected: FAIL because the enum, properties, DTO, and mapping do not exist.

- [ ] **Step 3: Implement the enum, fields, DTOs, and mapping**

```csharp
public enum StudyTaskPriority { Low, Medium, High }

public sealed record StudyTaskDto(
    int Id, string Title, string Course, string? Notes, DateTime DueDate,
    StudyTaskPriority Priority, bool IsCompleted);

public sealed class UpsertStudyTaskDto
{
    [Required, StringLength(160)] public string Title { get; init; } = string.Empty;
    [Required, StringLength(100)] public string Course { get; init; } = string.Empty;
    [StringLength(2000)] public string? Notes { get; init; }
    public DateTime DueDate { get; init; }
    [EnumDataType(typeof(StudyTaskPriority))] public StudyTaskPriority Priority { get; init; }
    public bool IsCompleted { get; init; }
}
```

Add `Course`, nullable `Notes`, and `Priority` to `StudyTask`; map `Priority` to a string and add the composite index `(UserId, DueDate)` in `OnModelCreating`.

- [ ] **Step 4: Generate the migration**

Run: `dotnet ef migrations add AddAssignmentDetails --project backend`

Expected: a migration adds the three assignment columns and owner/date index without changing expense data.

- [ ] **Step 5: Run tests and inspect the migration**

Run: `dotnet test backend.Tests/backend.Tests.csproj`

Run: `dotnet ef migrations script --project backend --idempotent`

Expected: tests pass; generated SQL contains assignment columns and the composite index.

- [ ] **Step 6: Commit**

```powershell
git add backend/Models backend/DTOs backend/Mappings backend/Data backend/Migrations backend.Tests/StudyTaskMappingsTests.cs
git commit -m "feat: add assignment details and contracts"
```

### Task 3: User-scoped assignment API

**Files:**
- Create: `backend/Controllers/TasksController.cs`
- Create: `backend.Tests/TasksControllerTests.cs`

**Interfaces:**
- Consumes: `ICurrentUserService.UserId`, `UpsertStudyTaskDto`, and `StudyTaskMappings.ToDto`.
- Produces: `GET /api/tasks?from&to`, optional unbounded `GET /api/tasks`, `GET /api/tasks/{id}`, `POST`, `PUT`, and `DELETE`.

- [ ] **Step 1: Write failing ownership and date-range tests**

```csharp
[Fact]
public async Task GetTasks_ReturnsOnlyOwnedTasksInRange()
{
    await using var db = TestDbContextFactory.Create();
    db.StudyTasks.AddRange(
        NewTask(1, new DateTime(2026, 8, 24, 12, 0, 0, DateTimeKind.Utc)),
        NewTask(2, new DateTime(2026, 8, 24, 12, 0, 0, DateTimeKind.Utc)),
        NewTask(1, new DateTime(2026, 9, 2, 12, 0, 0, DateTimeKind.Utc)));
    await db.SaveChangesAsync();
    var controller = new TasksController(db, new FakeCurrentUserService(1));

    var result = await controller.GetTasks(
        new DateTime(2026, 8, 24, 0, 0, 0, DateTimeKind.Utc),
        new DateTime(2026, 8, 28, 23, 59, 59, DateTimeKind.Utc));

    Assert.Single(result.Value!);
    Assert.Equal(new DateTime(2026, 8, 24, 12, 0, 0, DateTimeKind.Utc), result.Value![0].DueDate);
}

[Fact]
public async Task DeleteTask_ReturnsNotFoundForAnotherUsersTask()
{
    await using var db = TestDbContextFactory.Create();
    var task = NewTask(2, DateTime.UtcNow);
    db.StudyTasks.Add(task);
    await db.SaveChangesAsync();
    var controller = new TasksController(db, new FakeCurrentUserService(1));

    var result = await controller.DeleteTask(task.Id);

    Assert.IsType<NotFoundResult>(result);
}
```

- [ ] **Step 2: Run the controller tests and verify failure**

Run: `dotnet test backend.Tests/backend.Tests.csproj --filter TasksControllerTests`

Expected: FAIL because `TasksController` does not exist.

- [ ] **Step 3: Implement scoped queries and mutations**

```csharp
[ApiController]
[Route("api/tasks")]
public sealed class TasksController(
    ApplicationDbContext db, ICurrentUserService currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<StudyTaskDto>>> GetTasks(DateTime? from, DateTime? to)
    {
        if (from.HasValue && to.HasValue && to < from)
            return ValidationProblem("'to' must be on or after 'from'.");
        var query = db.StudyTasks.AsNoTracking()
            .Where(x => x.UserId == currentUser.UserId);
        if (from.HasValue) query = query.Where(x => x.DueDate >= from.Value);
        if (to.HasValue) query = query.Where(x => x.DueDate <= to.Value);
        var tasks = await query.OrderBy(x => x.DueDate).ToListAsync();
        return tasks.Select(x => x.ToDto()).ToList();
    }
}
```

Implement get-by-id, create, update, and delete with the same `UserId == currentUser.UserId` predicate. Set `UserId` from the service during create; never copy it from a DTO.

- [ ] **Step 4: Add CRUD validation tests**

Cover create ownership, update mapping, completion changes, inverted date ranges, an unbounded request returning every owned assignment, and `404` for foreign records. Use exact status assertions and persisted-row assertions.

- [ ] **Step 5: Run backend verification**

Run: `dotnet test backend.Tests/backend.Tests.csproj`

Run: `dotnet build backend/backend.csproj --no-restore`

Expected: both commands exit 0 with zero failed tests and zero build errors.

- [ ] **Step 6: Commit**

```powershell
git add backend/Controllers/TasksController.cs backend.Tests/TasksControllerTests.cs
git commit -m "feat: add user scoped assignment API"
```

### Task 4: Frontend test setup, week utilities, and assignment client

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.js`
- Create: `frontend/src/test/setup.js`
- Create: `frontend/src/utils/week.js`
- Create: `frontend/src/utils/week.test.js`
- Create: `frontend/src/api/http.js`
- Create: `frontend/src/api/tasks.js`
- Create: `frontend/src/api/tasks.test.js`

**Interfaces:**
- Produces: `getWeekRange(date) -> { start: Date, end: Date, days: Date[] }`.
- Produces: `listTasks({ from, to, signal } = {})`, `createTask(input)`, `updateTask(id, input)`, `deleteTask(id)`.

- [ ] **Step 1: Install and configure frontend tests**

Run:

```powershell
cd frontend
npm install --save-dev vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Add `"test": "vitest run"` and `"test:watch": "vitest"` scripts. Configure Vitest with `environment: 'jsdom'` and `setupFiles: './src/test/setup.js'`.

- [ ] **Step 2: Write failing week utility tests**

```js
it('returns Monday through Friday for a Wednesday', () => {
  const range = getWeekRange(new Date(2026, 7, 26, 12))
  expect(range.days.map((day) => day.getDate())).toEqual([24, 25, 26, 27, 28])
})

it('moves a Sunday back to the preceding school week', () => {
  expect(getWeekRange(new Date(2026, 7, 30, 12)).start.getDate()).toBe(24)
})
```

- [ ] **Step 3: Verify the tests fail, then implement the utility**

Run: `npm test -- src/utils/week.test.js`

Expected: FAIL because `getWeekRange` is missing.

```js
export function getWeekRange(input) {
  const date = new Date(input)
  const day = date.getDay()
  const offset = day === 0 ? -6 : 1 - day
  const start = new Date(date)
  start.setDate(date.getDate() + offset)
  start.setHours(0, 0, 0, 0)
  const days = Array.from({ length: 5 }, (_, index) => {
    const value = new Date(start)
    value.setDate(start.getDate() + index)
    return value
  })
  const end = new Date(days[4])
  end.setHours(23, 59, 59, 999)
  return { start, end, days }
}
```

- [ ] **Step 4: Write and implement API-client tests**

Mock `fetch` and assert `listTasks` encodes both ISO range values, `createTask` sends JSON, and non-2xx problem responses throw an `ApiError` whose `details` preserve validation messages.

```js
export async function request(path, options = {}) {
  const response = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:5000'}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers }, ...options,
  })
  const body = response.status === 204 ? null : await response.json()
  if (!response.ok) throw new ApiError(response.status, body)
  return body
}
```

- [ ] **Step 5: Run frontend tests and lint**

Run: `npm test`

Run: `npm run lint`

Expected: both commands exit 0.

- [ ] **Step 6: Commit**

```powershell
git add frontend/package.json frontend/package-lock.json frontend/vite.config.js frontend/src/test frontend/src/utils frontend/src/api
git commit -m "test: add assignment frontend foundations"
```

### Task 5: Approved dashboard shell and weekly planner

**Files:**
- Create: `frontend/src/components/layout/Sidebar.jsx`
- Create: `frontend/src/components/layout/DashboardHeader.jsx`
- Create: `frontend/src/components/assignments/AssignmentCard.jsx`
- Create: `frontend/src/components/assignments/WeeklyPlanner.jsx`
- Create: `frontend/src/components/assignments/WeeklyPlanner.test.jsx`
- Create: `frontend/src/components/shared/EmptyState.jsx`
- Create: `frontend/src/components/shared/ErrorState.jsx`
- Create: `frontend/src/styles/tokens.css`
- Create: `frontend/src/styles/dashboard.css`
- Create: `frontend/src/styles/planner.css`
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/App.css`

**Interfaces:**
- Consumes: `getWeekRange`, `listTasks`.
- Produces: `WeeklyPlanner({ days, tasks, onPreviousWeek, onNextWeek, onSelectTask })`.

- [ ] **Step 1: Write failing planner rendering tests**

```jsx
it('places assignments in their weekday and shows empty days', () => {
  render(<WeeklyPlanner days={weekDays} tasks={[essay]} />)
  expect(screen.getByRole('heading', { name: 'Research essay' })).toBeInTheDocument()
  expect(screen.getAllByText('No assignments')).toHaveLength(4)
})

it('calls week navigation actions', async () => {
  const previous = vi.fn()
  render(<WeeklyPlanner days={weekDays} tasks={[]} onPreviousWeek={previous} />)
  await userEvent.click(screen.getByRole('button', { name: 'Previous week' }))
  expect(previous).toHaveBeenCalledOnce()
})
```

- [ ] **Step 2: Verify the planner test fails**

Run: `npm test -- src/components/assignments/WeeklyPlanner.test.jsx`

Expected: FAIL because the planner components do not exist.

- [ ] **Step 3: Implement semantic components**

```jsx
export function AssignmentCard({ task, onSelect }) {
  return (
    <button className={`assignment-card priority-${task.priority.toLowerCase()}`}
      onClick={() => onSelect?.(task)}>
      <strong>{task.title}</strong>
      <span>{task.course} · {formatTime(task.dueDate)}</span>
    </button>
  )
}
```

Render five labeled day sections, accessible previous/next buttons, per-day tasks, loading state, section-level `ErrorState`, and the thin next-deadline row. Keep weekend tasks out of columns but include them when calculating the reminder.

- [ ] **Step 4: Recreate the approved visual system**

Define CSS variables for forest green `#1f4034`, cream background `#f4f6f2`, gold action `#e8bd69`, text, borders, and priority colors. Use a five-column desktop grid and a horizontally scrollable fixed-width grid below 800px. Remove the Vite starter artwork and dark-mode template rules.

- [ ] **Step 5: Run focused tests, full tests, lint, and build**

Run: `npm test -- src/components/assignments/WeeklyPlanner.test.jsx`

Run: `npm test; npm run lint; npm run build`

Expected: all commands exit 0 and Vite writes the production bundle to `frontend/dist`.

- [ ] **Step 6: Commit**

```powershell
git add frontend/src
git commit -m "feat: build weekly assignment dashboard"
```

### Task 6: Assignment create, edit, complete, and delete flows

**Files:**
- Create: `frontend/src/components/shared/Dialog.jsx`
- Create: `frontend/src/components/shared/ConfirmDialog.jsx`
- Create: `frontend/src/components/assignments/AssignmentForm.jsx`
- Create: `frontend/src/components/assignments/AssignmentForm.test.jsx`
- Create: `frontend/src/components/assignments/AllAssignmentsDialog.jsx`
- Create: `frontend/src/components/assignments/AllAssignmentsDialog.test.jsx`
- Create: `frontend/src/hooks/useAssignments.js`
- Create: `frontend/src/hooks/useAssignments.test.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/styles/dialog.css`

**Interfaces:**
- Produces: `useAssignments({ start, end })` with `tasks`, `status`, `error`, `create`, `update`, `remove`, and `retry`.
- Produces: `AssignmentForm({ initialTask, onSubmit, onDelete, onCancel })`.
- Produces: `AllAssignmentsDialog({ open, tasks, status, onSelect, onClose })`.

- [ ] **Step 1: Write failing form validation and retry-state tests**

```jsx
it('requires title, course, and due date', async () => {
  render(<AssignmentForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
  await userEvent.click(screen.getByRole('button', { name: 'Save assignment' }))
  expect(await screen.findByText('Title is required')).toBeInTheDocument()
  expect(screen.getByText('Course is required')).toBeInTheDocument()
  expect(screen.getByText('Due date and time are required')).toBeInTheDocument()
})

it('keeps values when submission fails', async () => {
  const submit = vi.fn().mockRejectedValue(new Error('offline'))
  render(<AssignmentForm onSubmit={submit} onCancel={vi.fn()} />)
  await fillRequiredAssignmentFields()
  await userEvent.click(screen.getByRole('button', { name: 'Save assignment' }))
  expect(await screen.findByDisplayValue('Research essay')).toBeInTheDocument()
  expect(screen.getByText('Could not save the assignment. Try again.')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `npm test -- src/components/assignments/AssignmentForm.test.jsx`

Expected: FAIL because the form and dialog do not exist.

- [ ] **Step 3: Implement controlled form and accessible dialogs**

Use labels for every field, native `datetime-local`, a Low/Medium/High select, completion checkbox in edit mode, inline errors, disabled submit while saving, and focus restoration on close. Do not clear state after a rejected promise.

```jsx
const payload = {
  title: values.title.trim(), course: values.course.trim(),
  dueDate: new Date(values.dueDate).toISOString(), priority: values.priority,
  isCompleted: values.isCompleted, notes: values.notes.trim() || null,
}
await onSubmit(payload)
```

- [ ] **Step 4: Implement the assignment hook with section refresh**

Use an `AbortController` for range changes. After create, update, or delete succeeds, refetch only assignments for the active week and the next-deadline range. Expose the mutation error to the form rather than closing it.

- [ ] **Step 5: Add interaction tests**

Test create opens from the header, selecting a card opens edit mode, completion persists, delete requires confirmation, cancel does not mutate, and API failure leaves the dialog open. Test **View all assignments** calls unbounded `listTasks()`, displays weekday and weekend records sorted by due date, and allows either record to open in edit mode.

- [ ] **Step 6: Run complete frontend and backend verification**

Run from `frontend`: `npm test; npm run lint; npm run build`

Run from repository root: `dotnet test backend.Tests/backend.Tests.csproj; dotnet build backend/backend.csproj --no-restore`

Expected: every command exits 0.

- [ ] **Step 7: Commit**

```powershell
git add frontend/src
git commit -m "feat: add assignment management flows"
```

### Task 7: Development integration and assignment milestone verification

**Files:**
- Modify: `backend/Program.cs`
- Modify: `backend/appsettings.Development.json`
- Modify: `frontend/.env.example`
- Create: `backend/Data/DevelopmentDataSeeder.cs`
- Create: `backend.Tests/DevelopmentDataSeederTests.cs`
- Modify: `README.md`

**Interfaces:**
- Consumes: assignment API and React assignment dashboard.
- Produces: repeatable local startup with one demo user and example assignments in development only.

- [ ] **Step 1: Write the failing idempotent-seed test**

```csharp
[Fact]
public async Task SeedAsync_CreatesDemoUserOnce()
{
    await using var db = TestDbContextFactory.Create();
    await DevelopmentDataSeeder.SeedAsync(db, 1);
    await DevelopmentDataSeeder.SeedAsync(db, 1);
    Assert.Single(db.Users.Where(x => x.Id == 1));
}
```

- [ ] **Step 2: Verify failure, then implement development-only seeding**

Run: `dotnet test backend.Tests/backend.Tests.csproj --filter DevelopmentDataSeederTests`

Expected: FAIL because the seeder does not exist.

Implement `SeedAsync(ApplicationDbContext db, int demoUserId)` with an existence check and stable demo identity. Call it after migration only when `app.Environment.IsDevelopment()`.

- [ ] **Step 3: Configure local frontend/backend connection**

Add `VITE_API_URL=http://localhost:<backend-development-port>` to `.env.example`. Configure CORS in development for the Vite origin from `Cors:Origins:0`; do not enable unrestricted production CORS.

- [ ] **Step 4: Document exact startup steps**

Add PostgreSQL setup, `dotnet ef database update --project backend`, backend start, frontend install/start, demo-user behavior, and test commands to `README.md`. Do not place passwords in new documentation.

- [ ] **Step 5: Run fresh milestone verification**

Run:

```powershell
dotnet test backend.Tests/backend.Tests.csproj
dotnet build backend/backend.csproj --no-restore
cd frontend
npm test
npm run lint
npm run build
```

Expected: zero failed tests, zero build errors, zero lint errors, and a successful Vite bundle.

- [ ] **Step 6: Manually verify the assignment smoke path**

Start PostgreSQL, apply migrations, start the API and Vite app, then create an assignment, navigate away and back to the week, edit it, complete it, and delete it. Verify the record persists between refreshes and no browser console error appears.

- [ ] **Step 7: Commit**

```powershell
git add backend/Program.cs backend/appsettings.Development.json backend/Data/DevelopmentDataSeeder.cs backend.Tests/DevelopmentDataSeederTests.cs frontend/.env.example README.md
git commit -m "chore: integrate assignment dashboard locally"
```
