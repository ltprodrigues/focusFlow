using backend.Models;
using backend.Services;

public sealed class FinanceSummaryServiceTests
{
    [Fact]
    public async Task GetAsync_GroupsOnlyOwnedExpensesInSelectedUtcMonth()
    {
        await using var db = TestDbContextFactory.Create();
        db.MonthlyBudgets.Add(new MonthlyBudget { UserId = 1, Year = 2026, Month = 8, Amount = 600m });
        db.Expenses.AddRange(
            ExpenseFor(1, "Food", 40m, Utc(2026, 8, 2)),
            ExpenseFor(1, "Food", 15m, Utc(2026, 8, 3)),
            ExpenseFor(1, "School", 25m, Utc(2026, 8, 31, 23, 59)),
            ExpenseFor(1, "Transport", 20m, Utc(2026, 8, 1)),
            ExpenseFor(2, "Food", 999m, Utc(2026, 8, 3)),
            ExpenseFor(1, "School", 65m, Utc(2026, 9, 1)));
        await db.SaveChangesAsync();

        var summary = await new FinanceSummaryService(db).GetAsync(1, 2026, 8, default);

        Assert.Equal(600m, summary.BudgetAmount);
        Assert.True(summary.HasBudget);
        Assert.Equal(100m, summary.TotalSpent);
        Assert.Equal(500m, summary.Remaining);
        Assert.False(summary.IsOverBudget);
        Assert.Collection(summary.Categories,
            item => { Assert.Equal("Food", item.Category); Assert.Equal(55m, item.Amount); },
            item => { Assert.Equal("School", item.Category); Assert.Equal(25m, item.Amount); },
            item => { Assert.Equal("Transport", item.Category); Assert.Equal(20m, item.Amount); });
    }

    [Fact]
    public async Task GetAsync_WithoutBudgetOrExpenses_ReturnsSetupState()
    {
        await using var db = TestDbContextFactory.Create();

        var summary = await new FinanceSummaryService(db).GetAsync(1, 2026, 8, default);

        Assert.False(summary.HasBudget);
        Assert.Equal(0m, summary.BudgetAmount);
        Assert.Equal(0m, summary.TotalSpent);
        Assert.Equal(0m, summary.Remaining);
        Assert.False(summary.IsOverBudget);
        Assert.Empty(summary.Categories);
    }

    [Fact]
    public async Task GetAsync_ReportsNegativeRemainderAsOverBudget()
    {
        await using var db = TestDbContextFactory.Create();
        db.MonthlyBudgets.Add(new MonthlyBudget { UserId = 1, Year = 2026, Month = 8, Amount = 50m });
        db.Expenses.Add(ExpenseFor(1, "Food", 75m, Utc(2026, 8, 2)));
        await db.SaveChangesAsync();

        var summary = await new FinanceSummaryService(db).GetAsync(1, 2026, 8, default);

        Assert.Equal(-25m, summary.Remaining);
        Assert.True(summary.IsOverBudget);
    }

    [Fact]
    public async Task GetAsync_WithCancelledToken_CancelsDatabaseQuery()
    {
        await using var db = TestDbContextFactory.Create();
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            new FinanceSummaryService(db).GetAsync(1, 2026, 8, cancellation.Token));
    }

    private static Expense ExpenseFor(int userId, string category, decimal amount, DateTime date) =>
        new() { UserId = userId, Title = category, Category = category, Amount = amount, Date = date };

    private static DateTime Utc(int year, int month, int day, int hour = 0, int minute = 0) =>
        new(year, month, day, hour, minute, 0, DateTimeKind.Utc);
}
