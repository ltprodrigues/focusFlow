# FocusFlow Finances and Combined Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user-scoped monthly budgets and expenses, then complete the approved combined dashboard with its compact budget strip.

**Architecture:** Extend the assignment milestone with a `MonthlyBudget` aggregate and scoped expense endpoints. A server-side finance-summary query returns budget, spending, remainder, over-budget state, and category totals; React consumes that contract in a compact CSS-donut budget strip and focused dialogs.

**Tech Stack:** .NET 10, ASP.NET Core, EF Core 10.0.8, PostgreSQL, React 19, Vite 8, Vitest, Testing Library, CSS `conic-gradient`

**Spec:** `docs/superpowers/specs/2026-08-30-focusflow-combined-dashboard-design.md`

## Global Constraints

- Execute this plan after `2026-08-30-focusflow-assignments-dashboard.md`.
- Reuse `ICurrentUserService`; never accept `UserId` from finance request bodies.
- Currency is CAD and money uses .NET `decimal`, PostgreSQL numeric columns, and locale-aware frontend formatting.
- Default categories are Food, Transport, School, Entertainment, Housing, and Other.
- Store category names as text so custom categories can be added later.
- Enforce one budget for each `(UserId, Year, Month)`.
- Preserve form values after failed requests and require confirmation before deletion.
- Do not add a chart library; render the single donut with CSS `conic-gradient`.
- Do not modify or stage the existing untracked `global.json` or `.superpowers/` artifacts.

## File Structure

### Backend

- `backend/Models/MonthlyBudget.cs`: owned budget amount for one calendar month.
- `backend/Models/Expense.cs`: expense record with optional notes.
- `backend/Models/User.cs`: monthly-budget navigation.
- `backend/DTOs/ExpenseDto.cs`: expense response.
- `backend/DTOs/UpsertExpenseDto.cs`: validated expense request without owner input.
- `backend/DTOs/UpsertMonthlyBudgetDto.cs`: validated budget amount.
- `backend/DTOs/FinanceSummaryDto.cs`: aggregated dashboard contract.
- `backend/Services/FinanceSummaryService.cs`: testable monthly calculation.
- `backend/Controllers/ExpensesController.cs`: rewritten owner-scoped CRUD.
- `backend/Controllers/BudgetsController.cs`: monthly budget get/upsert.
- `backend/Controllers/FinanceController.cs`: monthly summary endpoint.
- `backend/Data/ApplicationDbContext.cs`: budget mapping, uniqueness, and expense index.
- `backend/Migrations/<timestamp>_AddMonthlyFinances.cs`: generated schema change.
- `backend.Tests/`: finance calculation, ownership, validation, and controller tests.

### Frontend

- `frontend/src/api/expenses.js`: expense CRUD functions.
- `frontend/src/api/finance.js`: budget and summary functions.
- `frontend/src/utils/currency.js`: CAD formatting.
- `frontend/src/utils/chart.js`: stable category-to-conic-gradient conversion.
- `frontend/src/hooks/useFinanceSummary.js`: finance loading and mutation orchestration.
- `frontend/src/components/finance/BudgetStrip.jsx`: approved compact strip.
- `frontend/src/components/finance/ExpenseForm.jsx`: create/edit expense dialog.
- `frontend/src/components/finance/BudgetForm.jsx`: set/update monthly amount.
- `frontend/src/components/finance/ExpenseList.jsx`: edit/delete entry point.
- `frontend/src/styles/budget.css`: strip, donut, forms, and mobile behavior.
- `frontend/src/App.jsx`: combines assignment and finance sections.

---

### Task 1: Finance model, DTOs, constraints, and migration

**Files:**
- Create: `backend/Models/MonthlyBudget.cs`
- Modify: `backend/Models/Expense.cs`
- Modify: `backend/Models/User.cs`
- Create: `backend/DTOs/ExpenseDto.cs`
- Create: `backend/DTOs/UpsertExpenseDto.cs`
- Create: `backend/DTOs/UpsertMonthlyBudgetDto.cs`
- Modify: `backend/Data/ApplicationDbContext.cs`
- Create: `backend.Tests/FinanceModelTests.cs`
- Create: `backend/Migrations/<generated>_AddMonthlyFinances.cs`
- Delete: `backend/DTOs/CreateExpenseDto.cs`

**Interfaces:**
- Produces: `MonthlyBudget { Id, Year, Month, Amount, UserId, User }`.
- Produces: `ExpenseDto(int Id, string Title, decimal Amount, string Category, DateTime Date, string? Notes)`.
- Produces: validated upsert DTOs without `UserId`.

- [ ] **Step 1: Write failing model metadata tests**

```csharp
[Fact]
public void MonthlyBudget_HasUniqueOwnerMonthIndex()
{
    using var db = TestDbContextFactory.Create();
    var entity = db.Model.FindEntityType(typeof(MonthlyBudget))!;
    var index = entity.GetIndexes().Single(x =>
        x.Properties.Select(p => p.Name).SequenceEqual(["UserId", "Year", "Month"]));
    Assert.True(index.IsUnique);
}

[Fact]
public void Expense_AllowsOptionalNotes()
{
    var expense = new Expense { Title = "Bus pass", Notes = null };
    Assert.Null(expense.Notes);
}
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `dotnet test backend.Tests/backend.Tests.csproj --filter FinanceModelTests`

Expected: FAIL because `MonthlyBudget`, `Expense.Notes`, and the unique index do not exist.

- [ ] **Step 3: Implement entities and request contracts**

```csharp
public sealed class MonthlyBudget
{
    public int Id { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal Amount { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
}
```

```csharp
public sealed class UpsertExpenseDto
{
    [Required, StringLength(160)] public string Title { get; init; } = string.Empty;
    [Range(typeof(decimal), "0.01", "79228162514264337593543950335")]
    public decimal Amount { get; init; }
    [Required, StringLength(80)] public string Category { get; init; } = string.Empty;
    public DateTime Date { get; init; }
    [StringLength(2000)] public string? Notes { get; init; }
}

public sealed class UpsertMonthlyBudgetDto
{
    [Range(typeof(decimal), "0.01", "79228162514264337593543950335")]
    public decimal Amount { get; init; }
}
```

Add `Notes` to `Expense`, `MonthlyBudgets` to `User` and `ApplicationDbContext`, the unique owner/year/month index, and `(UserId, Date)` expense index.

- [ ] **Step 4: Generate and inspect the migration**

Run: `dotnet ef migrations add AddMonthlyFinances --project backend`

Run: `dotnet ef migrations script --project backend --idempotent`

Expected: SQL adds `MonthlyBudgets`, expense notes, both indexes, and the foreign key to `Users`.

- [ ] **Step 5: Run backend tests**

Run: `dotnet test backend.Tests/backend.Tests.csproj`

Expected: PASS with zero failed tests.

- [ ] **Step 6: Commit**

```powershell
git add backend/Models backend/DTOs backend/Data backend/Migrations backend.Tests/FinanceModelTests.cs
git commit -m "feat: add monthly finance model"
```

### Task 2: Finance summary calculation service

**Files:**
- Create: `backend/DTOs/CategoryTotalDto.cs`
- Create: `backend/DTOs/FinanceSummaryDto.cs`
- Create: `backend/Services/IFinanceSummaryService.cs`
- Create: `backend/Services/FinanceSummaryService.cs`
- Create: `backend.Tests/FinanceSummaryServiceTests.cs`
- Modify: `backend/Program.cs`

**Interfaces:**
- Produces: `Task<FinanceSummaryDto> GetAsync(int userId, int year, int month, CancellationToken cancellationToken)`.
- Produces: summary fields `BudgetAmount`, `TotalSpent`, `Remaining`, `IsOverBudget`, and `Categories`.

- [ ] **Step 1: Write failing calculation tests**

```csharp
[Fact]
public async Task GetAsync_GroupsOwnedMonthExpensesAndCalculatesRemainder()
{
    await using var db = TestDbContextFactory.Create();
    db.MonthlyBudgets.Add(new MonthlyBudget { UserId = 1, Year = 2026, Month = 8, Amount = 600m });
    db.Expenses.AddRange(
        ExpenseFor(1, "Food", 40m, new DateTime(2026, 8, 2)),
        ExpenseFor(1, "Food", 15m, new DateTime(2026, 8, 3)),
        ExpenseFor(2, "Food", 999m, new DateTime(2026, 8, 3)),
        ExpenseFor(1, "School", 65m, new DateTime(2026, 9, 1)));
    await db.SaveChangesAsync();

    var summary = await new FinanceSummaryService(db).GetAsync(1, 2026, 8, default);

    Assert.Equal(55m, summary.TotalSpent);
    Assert.Equal(545m, summary.Remaining);
    Assert.False(summary.IsOverBudget);
    Assert.Equal(55m, Assert.Single(summary.Categories).Amount);
}

[Fact]
public async Task GetAsync_ReportsNegativeRemainderAsOverBudget()
{
    var summary = await BuildSummary(budget: 50m, expense: 75m);
    Assert.Equal(-25m, summary.Remaining);
    Assert.True(summary.IsOverBudget);
}
```

- [ ] **Step 2: Verify expected failure**

Run: `dotnet test backend.Tests/backend.Tests.csproj --filter FinanceSummaryServiceTests`

Expected: FAIL because summary types and service do not exist.

- [ ] **Step 3: Implement one database-backed aggregation**

```csharp
public async Task<FinanceSummaryDto> GetAsync(
    int userId, int year, int month, CancellationToken cancellationToken)
{
    var start = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
    var end = start.AddMonths(1);
    var budget = await db.MonthlyBudgets.AsNoTracking()
        .Where(x => x.UserId == userId && x.Year == year && x.Month == month)
        .Select(x => (decimal?)x.Amount).SingleOrDefaultAsync(cancellationToken);
    var categories = await db.Expenses.AsNoTracking()
        .Where(x => x.UserId == userId && x.Date >= start && x.Date < end)
        .GroupBy(x => x.Category)
        .Select(group => new CategoryTotalDto(group.Key, group.Sum(x => x.Amount)))
        .OrderByDescending(x => x.Amount).ToListAsync(cancellationToken);
    var spent = categories.Sum(x => x.Amount);
    var amount = budget ?? 0m;
    return new FinanceSummaryDto(year, month, amount, spent, amount - spent,
        spent > amount, budget.HasValue, categories);
}
```

Return `HasBudget = false` when absent so the frontend can display a setup state rather than treating zero as a configured budget.

- [ ] **Step 4: Register the service and run tests**

Register `IFinanceSummaryService` scoped to `FinanceSummaryService` in `Program.cs`.

Run: `dotnet test backend.Tests/backend.Tests.csproj`

Expected: PASS including zero-expense, no-budget, category grouping, foreign-user exclusion, and over-budget tests.

- [ ] **Step 5: Commit**

```powershell
git add backend/DTOs backend/Services backend/Program.cs backend.Tests/FinanceSummaryServiceTests.cs
git commit -m "feat: calculate monthly finance summaries"
```

### Task 3: User-scoped expense, budget, and finance endpoints

**Files:**
- Replace: `backend/Controllers/ExpensesController.cs`
- Create: `backend/Controllers/BudgetsController.cs`
- Create: `backend/Controllers/FinanceController.cs`
- Create: `backend.Tests/ExpensesControllerTests.cs`
- Create: `backend.Tests/BudgetsControllerTests.cs`
- Create: `backend.Tests/FinanceControllerTests.cs`

**Interfaces:**
- Consumes: `ICurrentUserService.UserId`, finance DTOs, and `IFinanceSummaryService`.
- Produces: scoped expense CRUD, budget get/upsert, and `GET /api/finance/summary`.

- [ ] **Step 1: Write failing ownership tests**

```csharp
[Fact]
public async Task GetExpense_ReturnsNotFoundForForeignOwner()
{
    await using var db = TestDbContextFactory.Create();
    var expense = ExpenseFor(userId: 2, category: "Food", amount: 20m, date: DateTime.UtcNow);
    db.Expenses.Add(expense);
    await db.SaveChangesAsync();
    var controller = new ExpensesController(db, new FakeCurrentUserService(1));

    var result = await controller.GetExpense(expense.Id);

    Assert.IsType<NotFoundResult>(result.Result);
}

[Fact]
public async Task PutBudget_UpsertsOwnedYearAndMonth()
{
    await using var db = TestDbContextFactory.Create();
    var controller = new BudgetsController(db, new FakeCurrentUserService(1));
    await controller.PutBudget(2026, 8, new UpsertMonthlyBudgetDto { Amount = 600m });
    await controller.PutBudget(2026, 8, new UpsertMonthlyBudgetDto { Amount = 650m });
    Assert.Equal(650m, Assert.Single(db.MonthlyBudgets).Amount);
}
```

- [ ] **Step 2: Verify controller tests fail**

Run: `dotnet test backend.Tests/backend.Tests.csproj --filter "ExpensesControllerTests|BudgetsControllerTests|FinanceControllerTests"`

Expected: FAIL because existing expenses accept `UserId` and budget/finance controllers do not exist.

- [ ] **Step 3: Rewrite expense CRUD with owned predicates**

```csharp
[HttpGet]
public async Task<ActionResult<List<ExpenseDto>>> GetExpenses(int year, int month)
{
    if (!IsValidMonth(year, month)) return ValidationProblem("Invalid year or month.");
    var start = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
    var end = start.AddMonths(1);
    return await db.Expenses.AsNoTracking()
        .Where(x => x.UserId == currentUser.UserId && x.Date >= start && x.Date < end)
        .OrderByDescending(x => x.Date)
        .Select(x => new ExpenseDto(x.Id, x.Title, x.Amount, x.Category, x.Date, x.Notes))
        .ToListAsync();
}
```

Create and update copy only allowed DTO fields. Get, update, and delete first filter by both record ID and active user ID.

- [ ] **Step 4: Implement budget and summary controllers**

`BudgetsController.GetBudget` returns `204 No Content` when no configured budget exists. `PutBudget` validates year/month, loads the owned row, inserts or updates it, saves once, and returns the persisted amount. `FinanceController` validates year/month and calls `IFinanceSummaryService.GetAsync` with the active user.

- [ ] **Step 5: Add validation and conflict tests**

Cover invalid months, nonpositive amounts, foreign records returning `404`, month filtering, server-assigned ownership, repeated budget upsert, and summary service arguments.

- [ ] **Step 6: Run backend verification**

Run: `dotnet test backend.Tests/backend.Tests.csproj`

Run: `dotnet build backend/backend.csproj --no-restore`

Expected: both commands exit 0.

- [ ] **Step 7: Commit**

```powershell
git add backend/Controllers backend.Tests/ExpensesControllerTests.cs backend.Tests/BudgetsControllerTests.cs backend.Tests/FinanceControllerTests.cs
git commit -m "feat: add user scoped finance API"
```

### Task 4: Finance frontend utilities and API clients

**Files:**
- Create: `frontend/src/utils/currency.js`
- Create: `frontend/src/utils/currency.test.js`
- Create: `frontend/src/utils/chart.js`
- Create: `frontend/src/utils/chart.test.js`
- Create: `frontend/src/api/expenses.js`
- Create: `frontend/src/api/expenses.test.js`
- Create: `frontend/src/api/finance.js`
- Create: `frontend/src/api/finance.test.js`

**Interfaces:**
- Produces: `formatCad(value)`.
- Produces: `buildConicGradient(categories, totalSpent)`.
- Produces: expense CRUD, `getFinanceSummary(year, month)`, and `putBudget(year, month, amount)`.

- [ ] **Step 1: Write failing currency and chart tests**

```js
it('formats CAD with two fractional digits', () => {
  expect(formatCad(258)).toMatch(/\$258\.00/)
})

it('uses category proportions in a conic gradient', () => {
  expect(buildConicGradient([
    { category: 'Food', amount: 75 }, { category: 'School', amount: 25 },
  ], 100)).toBe('conic-gradient(#e4a070 0% 75%, #7fb17b 75% 100%)')
})
```

- [ ] **Step 2: Verify failure, then implement deterministic helpers**

Run: `npm test -- src/utils/currency.test.js src/utils/chart.test.js`

Expected: FAIL because both modules are missing.

```js
const cad = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' })
export const formatCad = (value) => cad.format(Number(value))
```

Use a fixed color map for default categories and a neutral fallback for custom categories. For zero spending, return `conic-gradient(#e8e8df 0% 100%)`.

- [ ] **Step 3: Write and implement API tests**

Mock `request` and assert exact routes and payloads:

```js
expect(request).toHaveBeenCalledWith('/api/finance/summary?year=2026&month=8', expect.anything())
expect(request).toHaveBeenCalledWith('/api/budgets/2026/8', {
  method: 'PUT', body: JSON.stringify({ amount: 600 }),
})
```

Expense payloads contain title, amount, category, date, and notes only.

- [ ] **Step 4: Run frontend verification**

Run: `npm test; npm run lint`

Expected: both commands exit 0.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/utils frontend/src/api
git commit -m "test: add finance frontend foundations"
```

### Task 5: Compact budget strip and monthly budget flow

**Files:**
- Create: `frontend/src/components/finance/BudgetStrip.jsx`
- Create: `frontend/src/components/finance/BudgetStrip.test.jsx`
- Create: `frontend/src/components/finance/BudgetForm.jsx`
- Create: `frontend/src/components/finance/BudgetForm.test.jsx`
- Create: `frontend/src/hooks/useFinanceSummary.js`
- Create: `frontend/src/hooks/useFinanceSummary.test.jsx`
- Create: `frontend/src/styles/budget.css`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Produces: `BudgetStrip({ summary, status, error, onRetry, onAddExpense, onEditBudget })`.
- Produces: `useFinanceSummary({ year, month })` with `summary`, `refresh`, and `saveBudget`.

- [ ] **Step 1: Write failing strip states and calculation-display tests**

```jsx
it('shows remaining budget, category totals, and add action', () => {
  render(<BudgetStrip summary={summary} status="success" onAddExpense={vi.fn()} />)
  expect(screen.getByText('$258.00')).toBeInTheDocument()
  expect(screen.getByText('Food')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Add expense' })).toBeInTheDocument()
})

it('shows an over-budget amount without clamping it', () => {
  render(<BudgetStrip summary={{ ...summary, remaining: -25, isOverBudget: true }} status="success" />)
  expect(screen.getByText('$25.00 over budget')).toBeInTheDocument()
})
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- src/components/finance/BudgetStrip.test.jsx`

Expected: FAIL because the finance components do not exist.

- [ ] **Step 3: Implement the approved compact horizontal strip**

Render a CSS donut, August label, budget/spent/remainder, up to four category totals, and the gold **Add expense** action. Provide loading skeleton, retry state, no-budget setup button, empty-spending state, and over-budget copy.

```jsx
<div className="budget-donut" style={{ '--budget-chart': buildConicGradient(summary.categories, summary.totalSpent) }}>
  <span>{percentUsed}%</span>
</div>
```

CSS uses `background: var(--budget-chart)` and collapses the category grid below 800px while preserving amount and action.

- [ ] **Step 4: Implement and test budget editing**

`BudgetForm` accepts a positive decimal, shows `Budget must be greater than zero`, preserves the input on rejection, and closes only after `saveBudget` resolves. The hook refreshes only finance data after success.

- [ ] **Step 5: Run tests, lint, and build**

Run: `npm test; npm run lint; npm run build`

Expected: all commands exit 0.

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/components/finance frontend/src/hooks/useFinanceSummary.js frontend/src/hooks/useFinanceSummary.test.jsx frontend/src/styles/budget.css frontend/src/App.jsx
git commit -m "feat: add compact monthly budget strip"
```

### Task 6: Expense create, edit, list, and delete flows

**Files:**
- Create: `frontend/src/components/finance/ExpenseForm.jsx`
- Create: `frontend/src/components/finance/ExpenseForm.test.jsx`
- Create: `frontend/src/components/finance/ExpenseList.jsx`
- Create: `frontend/src/components/finance/ExpenseList.test.jsx`
- Create: `frontend/src/hooks/useExpenses.js`
- Create: `frontend/src/hooks/useExpenses.test.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/styles/budget.css`

**Interfaces:**
- Produces: `ExpenseForm({ initialExpense, onSubmit, onCancel })`.
- Produces: `useExpenses({ year, month })` with list and CRUD mutations.
- Consumes: shared `Dialog` and `ConfirmDialog` from the assignment plan.

- [ ] **Step 1: Write failing validation and retained-state tests**

```jsx
it('requires positive amount and a category', async () => {
  render(<ExpenseForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
  await userEvent.type(screen.getByLabelText('Amount'), '0')
  await userEvent.click(screen.getByRole('button', { name: 'Save expense' }))
  expect(screen.getByText('Amount must be greater than zero')).toBeInTheDocument()
  expect(screen.getByText('Category is required')).toBeInTheDocument()
})

it('preserves all values after an API error', async () => {
  const submit = vi.fn().mockRejectedValue(new Error('offline'))
  render(<ExpenseForm onSubmit={submit} onCancel={vi.fn()} />)
  await fillExpense({ title: 'Bus pass', amount: '28', category: 'Transport' })
  await userEvent.click(screen.getByRole('button', { name: 'Save expense' }))
  expect(await screen.findByDisplayValue('Bus pass')).toBeInTheDocument()
  expect(screen.getByText('Could not save the expense. Try again.')).toBeInTheDocument()
})
```

- [ ] **Step 2: Verify expected failure**

Run: `npm test -- src/components/finance/ExpenseForm.test.jsx`

Expected: FAIL because the form does not exist.

- [ ] **Step 3: Implement the form with stable defaults**

Use title, amount with `step="0.01"`, category select, date, and optional notes. Default the date to today and categories to Food, Transport, School, Entertainment, Housing, and Other. Submit numeric amount and ISO date; never include `UserId`.

- [ ] **Step 4: Implement list, edit, and delete**

The finances view lists the selected month's expenses newest first. Selecting a row opens edit mode. Delete opens `ConfirmDialog`, calls `remove`, and refreshes the expense list and finance summary after success.

- [ ] **Step 5: Add interaction tests**

Cover add from the budget strip, successful close, failed submission remaining open, edit prefill, confirmed delete, cancelled delete, empty list, and independent list retry.

- [ ] **Step 6: Run complete frontend verification**

Run: `npm test; npm run lint; npm run build`

Expected: all commands exit 0.

- [ ] **Step 7: Commit**

```powershell
git add frontend/src/components/finance frontend/src/hooks/useExpenses.js frontend/src/hooks/useExpenses.test.jsx frontend/src/App.jsx frontend/src/styles/budget.css
git commit -m "feat: add expense management flows"
```

### Task 7: Combined dashboard integration, development data, and final verification

**Files:**
- Modify: `backend/Data/DevelopmentDataSeeder.cs`
- Modify: `backend.Tests/DevelopmentDataSeederTests.cs`
- Create: `frontend/src/App.test.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/styles/dashboard.css`
- Modify: `README.md`

**Interfaces:**
- Consumes: assignment dashboard, finance summary, expense flow, and development demo user.
- Produces: the complete approved FocusFlow dashboard and reproducible smoke path.

- [ ] **Step 1: Extend the failing seed test**

```csharp
[Fact]
public async Task SeedAsync_CreatesOneDemoBudgetAndStableExpenses()
{
    await using var db = TestDbContextFactory.Create();
    await DevelopmentDataSeeder.SeedAsync(db, 1);
    await DevelopmentDataSeeder.SeedAsync(db, 1);
    Assert.Single(db.MonthlyBudgets.Where(x => x.UserId == 1));
    Assert.Equal(db.Expenses.Select(x => x.Id).Distinct().Count(), db.Expenses.Count());
}
```

- [ ] **Step 2: Verify failure, then add finance demo data**

Run: `dotnet test backend.Tests/backend.Tests.csproj --filter DevelopmentDataSeederTests`

Expected: FAIL until a current-month budget and representative Food, Transport, School, and Other expenses are seeded idempotently in development.

- [ ] **Step 3: Write the failing combined dashboard test**

Mock task and finance APIs, render `App`, and assert the weekday planner, thin reminder, compact budget strip, **Add assignment**, and **Add expense** are present simultaneously. Assert a failed finance request leaves assignments visible and exposes only finance retry UI.

- [ ] **Step 4: Integrate independent section loading and error states**

Keep assignment and finance hooks independent in `App`. Do not use a single page-wide loading flag. Add an unexpected-error boundary around the page shell and brief `role="status"` feedback after successful mutations.

- [ ] **Step 5: Verify responsive behavior**

At 1440px, verify five weekdays and the full budget category grid appear without horizontal page scrolling. At 390px, verify the sidebar collapses, weekday columns scroll within the planner, category totals collapse, and both primary actions remain reachable by keyboard.

- [ ] **Step 6: Run fresh repository verification**

Run:

```powershell
dotnet test backend.Tests/backend.Tests.csproj
dotnet build backend/backend.csproj --no-restore
cd frontend
npm test
npm run lint
npm run build
```

Expected: zero failed tests, zero build errors, zero lint errors, and a successful production bundle.

- [ ] **Step 7: Run the persisted-data smoke path**

Apply PostgreSQL migrations and start both applications. Create an assignment and an expense, refresh the browser, and verify both remain. Change the monthly budget and verify remainder and donut update. Edit and delete the expense and verify totals refresh. Confirm the browser console and API log contain no unhandled errors.

- [ ] **Step 8: Update documentation and commit**

Document budget setup, default categories, CAD behavior, demo data, and all verification commands.

```powershell
git add backend/Data/DevelopmentDataSeeder.cs backend.Tests/DevelopmentDataSeederTests.cs frontend/src/App.jsx frontend/src/App.test.jsx frontend/src/styles/dashboard.css README.md
git commit -m "feat: complete combined FocusFlow dashboard"
```
