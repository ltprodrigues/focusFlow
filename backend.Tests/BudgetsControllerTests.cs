using System.ComponentModel.DataAnnotations;
using backend.Controllers;
using backend.DTOs;
using backend.Models;
using backend.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

public class BudgetsControllerTests
{
    [Fact]
    public async Task PutBudget_UpsertsOwnedYearAndMonth()
    {
        await using var db = TestDbContextFactory.Create();
        var controller = new BudgetsController(db, new FakeCurrentUserService(1));

        await controller.PutBudget(2026, 8, new UpsertMonthlyBudgetDto { Amount = 600m });
        var result = await controller.PutBudget(2026, 8, new UpsertMonthlyBudgetDto { Amount = 650m });

        Assert.Equal(650m, Assert.Single(db.MonthlyBudgets).Amount);
        Assert.Equal(650m, result.Value!.Amount);
    }

    [Fact]
    public async Task PutBudget_DoesNotOverwriteAnotherUsersBudget()
    {
        await using var db = TestDbContextFactory.Create();
        db.MonthlyBudgets.Add(new MonthlyBudget { UserId = 2, Year = 2026, Month = 8, Amount = 900m });
        await db.SaveChangesAsync();
        var controller = new BudgetsController(db, new FakeCurrentUserService(1));

        await controller.PutBudget(2026, 8, new UpsertMonthlyBudgetDto { Amount = 600m });

        Assert.Equal(2, db.MonthlyBudgets.Count());
        Assert.Equal(900m, db.MonthlyBudgets.Single(x => x.UserId == 2).Amount);
    }

    [Fact]
    public async Task GetBudget_ReturnsNoContentWhenBudgetIsNotConfigured()
    {
        await using var db = TestDbContextFactory.Create();
        var controller = new BudgetsController(db, new FakeCurrentUserService(1));

        var result = await controller.GetBudget(2026, 8);

        Assert.IsType<NoContentResult>(result.Result);
    }

    [Fact]
    public async Task GetBudget_ReturnsOnlyOwnedBudget()
    {
        await using var db = TestDbContextFactory.Create();
        db.MonthlyBudgets.AddRange(
            new MonthlyBudget { UserId = 1, Year = 2026, Month = 8, Amount = 600m },
            new MonthlyBudget { UserId = 2, Year = 2026, Month = 8, Amount = 900m });
        await db.SaveChangesAsync();
        var controller = new BudgetsController(db, new FakeCurrentUserService(1));

        var result = await controller.GetBudget(2026, 8);

        Assert.Equal(600m, result.Value!.Amount);
    }

    [Theory]
    [InlineData(2026, 0)]
    [InlineData(2026, 13)]
    [InlineData(0, 8)]
    [InlineData(9999, 8)]
    public async Task BudgetEndpoints_RejectInvalidYearOrMonth(int year, int month)
    {
        await using var db = TestDbContextFactory.Create();
        var controller = new BudgetsController(db, new FakeCurrentUserService(1));

        var get = await controller.GetBudget(year, month);
        var put = await controller.PutBudget(year, month, new UpsertMonthlyBudgetDto { Amount = 1m });

        Assert.IsAssignableFrom<ObjectResult>(get.Result);
        Assert.IsAssignableFrom<ObjectResult>(put.Result);
    }

    [Fact]
    public void BudgetPayload_RejectsNonpositiveAmount()
    {
        var request = new UpsertMonthlyBudgetDto { Amount = 0m };
        var results = new List<ValidationResult>();

        Assert.False(Validator.TryValidateObject(request, new ValidationContext(request), results, true));
        Assert.Contains(results, x => x.MemberNames.Contains(nameof(request.Amount)));
    }

    [Fact]
    public async Task PutBudget_RecoversWhenAnotherRequestInsertsTheSameOwnedPeriod()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var plainOptions = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(connection)
            .Options;
        await using (var setup = new ApplicationDbContext(plainOptions))
        {
            await setup.Database.EnsureCreatedAsync();
            setup.Users.Add(new User { Id = 1, Name = "Demo", Email = "demo@example.test" });
            await setup.SaveChangesAsync();
        }

        var interceptor = new CompetingBudgetInsertInterceptor(plainOptions);
        var racingOptions = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(connection)
            .AddInterceptors(interceptor)
            .Options;
        await using var db = new ApplicationDbContext(racingOptions);
        var controller = new BudgetsController(db, new FakeCurrentUserService(1));

        var result = await controller.PutBudget(
            2026,
            8,
            new UpsertMonthlyBudgetDto { Amount = 650m });

        Assert.True(interceptor.InsertedCompetingBudget);
        Assert.Equal(650m, result.Value!.Amount);
        await using var verification = new ApplicationDbContext(plainOptions);
        var persisted = await verification.MonthlyBudgets.SingleAsync();
        Assert.Equal(1, persisted.UserId);
        Assert.Equal(650m, persisted.Amount);
    }

    private sealed class CompetingBudgetInsertInterceptor(
        DbContextOptions<ApplicationDbContext> competitorOptions) : SaveChangesInterceptor
    {
        public bool InsertedCompetingBudget { get; private set; }

        public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
        {
            if (InsertedCompetingBudget ||
                eventData.Context is not ApplicationDbContext context ||
                !context.ChangeTracker.Entries<MonthlyBudget>().Any(entry => entry.State == EntityState.Added))
                return result;

            InsertedCompetingBudget = true;
            await using var competitor = new ApplicationDbContext(competitorOptions);
            competitor.MonthlyBudgets.Add(new MonthlyBudget
            {
                UserId = 1,
                Year = 2026,
                Month = 8,
                Amount = 500m
            });
            await competitor.SaveChangesAsync(cancellationToken);
            return result;
        }
    }
}
