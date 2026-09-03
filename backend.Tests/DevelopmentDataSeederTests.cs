using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

public class DevelopmentDataSeederTests
{
    [Fact]
    public async Task SeedAsync_CreatesDemoUserOnce()
    {
        await using var db = TestDbContextFactory.Create();

        await DevelopmentDataSeeder.SeedAsync(db, 1);
        await DevelopmentDataSeeder.SeedAsync(db, 1);

        Assert.Single(db.Users.Where(user => user.Id == 1));
    }

    [Fact]
    public async Task SeedAsync_CreatesSmallTaskSetOnce()
    {
        await using var db = TestDbContextFactory.Create();
        await DevelopmentDataSeeder.SeedAsync(db, 1);
        await DevelopmentDataSeeder.SeedAsync(db, 1);
        Assert.InRange(await db.StudyTasks.CountAsync(task => task.UserId == 1), 2, 4);
    }

    [Fact]
    public async Task SeedAsync_CreatesOneDemoBudgetAndStableExpenses()
    {
        await using var db = TestDbContextFactory.Create();

        await DevelopmentDataSeeder.SeedAsync(db, 1);
        var firstIds = await db.Expenses.OrderBy(expense => expense.Title).Select(expense => expense.Id).ToArrayAsync();
        await DevelopmentDataSeeder.SeedAsync(db, 1);

        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var nextMonthStart = monthStart.AddMonths(1);
        Assert.Single(db.MonthlyBudgets.Where(budget => budget.UserId == 1 && budget.Year == now.Year && budget.Month == now.Month));
        Assert.Equal(new[] { "Food", "Other", "School", "Transport" },
            await db.Expenses.Where(expense => expense.UserId == 1 && expense.Date >= monthStart && expense.Date < nextMonthStart).OrderBy(expense => expense.Category).Select(expense => expense.Category).ToArrayAsync());
        Assert.Equal(firstIds, await db.Expenses.OrderBy(expense => expense.Title).Select(expense => expense.Id).ToArrayAsync());
    }

    [Fact]
    public async Task SeedAsync_CompletesPartialFinanceDataWithoutDuplicatingExistingRows()
    {
        await using var db = TestDbContextFactory.Create();
        db.Users.Add(new User { Id = 1, Name = "Existing", Email = "existing@example.test", PasswordHash = "test" });
        db.Expenses.Add(new Expense
        {
            UserId = 1,
            Title = "Campus lunch",
            Amount = 14.50m,
            Category = "Food",
            Date = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 3, 12, 0, 0, DateTimeKind.Utc)
        });
        await db.SaveChangesAsync();

        await DevelopmentDataSeeder.SeedAsync(db, 1);
        await DevelopmentDataSeeder.SeedAsync(db, 1);

        Assert.Equal(4, await db.Expenses.CountAsync(expense => expense.UserId == 1));
        Assert.Single(db.Expenses.Where(expense => expense.UserId == 1 && expense.Title == "Campus lunch"));
    }

    [Fact]
    public async Task SeedAsync_UsesTorontoCalendarMonthAtUtcBoundary()
    {
        await using var db = TestDbContextFactory.Create();
        var utcBoundary = new DateTimeOffset(2026, 9, 1, 2, 0, 0, TimeSpan.Zero);

        await DevelopmentDataSeeder.SeedAsync(db, 1, utcBoundary, "America/Toronto");
        await DevelopmentDataSeeder.SeedAsync(db, 1, utcBoundary, "America/Toronto");

        var budget = Assert.Single(await db.MonthlyBudgets.ToListAsync());
        Assert.Equal(2026, budget.Year);
        Assert.Equal(8, budget.Month);
        Assert.Equal(4, await db.Expenses.CountAsync(expense => expense.Date >= new DateTime(2026, 8, 1, 4, 0, 0, DateTimeKind.Utc)
            && expense.Date < new DateTime(2026, 9, 1, 4, 0, 0, DateTimeKind.Utc)));
    }

    [Fact]
    public void AppSettings_DoesNotContainDatabasePassword()
    {
        var path = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../backend/appsettings.json"));
        using var document = JsonDocument.Parse(File.ReadAllText(path));
        var connection = document.RootElement.GetProperty("ConnectionStrings").GetProperty("DefaultConnection").GetString();

        Assert.True(string.IsNullOrWhiteSpace(connection));
    }
}
