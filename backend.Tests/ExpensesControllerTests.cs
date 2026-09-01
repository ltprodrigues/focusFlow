using System.ComponentModel.DataAnnotations;
using backend.Controllers;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

public class ExpensesControllerTests
{
    [Fact]
    public async Task GetExpense_ReturnsNotFoundForForeignOwner()
    {
        await using var db = TestDbContextFactory.Create();
        var expense = NewExpense(2, "Food", 20m, DateTime.UtcNow);
        db.Expenses.Add(expense);
        await db.SaveChangesAsync();
        var controller = new ExpensesController(db, new FakeCurrentUserService(1));

        var result = await controller.GetExpense(expense.Id);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task GetExpenses_FiltersByOwnerAndCalendarMonth()
    {
        await using var db = TestDbContextFactory.Create();
        db.Expenses.AddRange(
            NewExpense(1, "Food", 20m, new DateTime(2026, 8, 31, 22, 0, 0, DateTimeKind.Utc)),
            NewExpense(2, "Food", 30m, new DateTime(2026, 8, 15, 12, 0, 0, DateTimeKind.Utc)),
            NewExpense(1, "School", 40m, new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc)));
        await db.SaveChangesAsync();
        var controller = new ExpensesController(db, new FakeCurrentUserService(1));

        var result = await controller.GetExpenses(2026, 8);

        var expense = Assert.Single(result.Value!);
        Assert.Equal(20m, expense.Amount);
    }

    [Theory]
    [InlineData(2026, 0)]
    [InlineData(2026, 13)]
    [InlineData(0, 8)]
    [InlineData(9999, 8)]
    public async Task GetExpenses_RejectsInvalidYearOrMonth(int year, int month)
    {
        await using var db = TestDbContextFactory.Create();
        var controller = new ExpensesController(db, new FakeCurrentUserService(1));

        var result = await controller.GetExpenses(year, month);

        Assert.IsAssignableFrom<ObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateExpense_AssignsOwnershipOnServerAndReturnsDto()
    {
        await using var db = TestDbContextFactory.Create();
        var controller = new ExpensesController(db, new FakeCurrentUserService(7));

        var result = await controller.CreateExpense(NewRequest());

        var response = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.IsType<ExpenseDto>(response.Value);
        Assert.Equal(7, (await db.Expenses.SingleAsync()).UserId);
    }

    [Fact]
    public void ExpensePayload_RejectsNonpositiveAmountBlankStringsAndMissingDate()
    {
        var request = new UpsertExpenseDto { Title = " ", Category = "\t", Amount = 0m };

        var results = new List<ValidationResult>();
        var valid = Validator.TryValidateObject(request, new ValidationContext(request), results, true);

        Assert.False(valid);
        Assert.Contains(results, x => x.MemberNames.Contains(nameof(request.Title)));
        Assert.Contains(results, x => x.MemberNames.Contains(nameof(request.Category)));
        Assert.Contains(results, x => x.MemberNames.Contains(nameof(request.Amount)));
        Assert.Contains(results, x => x.MemberNames.Contains(nameof(request.Date)));
    }

    [Fact]
    public async Task UpdateExpense_ReturnsNotFoundForForeignOwnerAndPreservesRecord()
    {
        await using var db = TestDbContextFactory.Create();
        var expense = NewExpense(2, "Food", 20m, DateTime.UtcNow);
        db.Expenses.Add(expense);
        await db.SaveChangesAsync();
        var controller = new ExpensesController(db, new FakeCurrentUserService(1));

        var result = await controller.UpdateExpense(expense.Id, NewRequest());

        Assert.IsType<NotFoundResult>(result);
        Assert.Equal(2, (await db.Expenses.SingleAsync()).UserId);
    }

    [Fact]
    public async Task UpdateExpense_CopiesOnlyAllowedFieldsAndKeepsOwnership()
    {
        await using var db = TestDbContextFactory.Create();
        var expense = NewExpense(1, "Food", 20m, DateTime.UtcNow);
        db.Expenses.Add(expense);
        await db.SaveChangesAsync();
        var controller = new ExpensesController(db, new FakeCurrentUserService(1));

        var result = await controller.UpdateExpense(expense.Id, NewRequest());

        Assert.IsType<NoContentResult>(result);
        var saved = await db.Expenses.SingleAsync();
        Assert.Equal(1, saved.UserId);
        Assert.Equal("Bus pass", saved.Title);
        Assert.Equal("Transport", saved.Category);
    }

    [Fact]
    public async Task DeleteExpense_ReturnsNotFoundForForeignOwner()
    {
        await using var db = TestDbContextFactory.Create();
        var expense = NewExpense(2, "Food", 20m, DateTime.UtcNow);
        db.Expenses.Add(expense);
        await db.SaveChangesAsync();
        var controller = new ExpensesController(db, new FakeCurrentUserService(1));

        var result = await controller.DeleteExpense(expense.Id);

        Assert.IsType<NotFoundResult>(result);
        Assert.Single(db.Expenses);
    }

    private static Expense NewExpense(int userId, string category, decimal amount, DateTime date) => new()
    {
        UserId = userId,
        Title = "Expense",
        Category = category,
        Amount = amount,
        Date = date
    };

    private static UpsertExpenseDto NewRequest() => new()
    {
        Title = "Bus pass",
        Category = "Transport",
        Amount = 45m,
        Date = new DateTime(2026, 8, 20, 12, 0, 0, DateTimeKind.Utc),
        Notes = "Monthly"
    };
}
