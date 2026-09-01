using System.ComponentModel.DataAnnotations;
using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.EntityFrameworkCore;

public sealed class FinanceModelTests
{
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
    public void Expense_HasOwnerDateIndex_AndAllowsOptionalNotes()
    {
        using var db = TestDbContextFactory.Create();
        var entity = db.Model.FindEntityType(typeof(Expense))!;

        Assert.Contains(entity.GetIndexes(), index =>
            index.Properties.Select(p => p.Name).SequenceEqual(["UserId", "Date"]));
        Assert.Null(new Expense { Title = "Bus pass", Notes = null }.Notes);
    }

    [Theory]
    [InlineData(null, "Transit", 10, "2026-09-01")]
    [InlineData("   ", "Transit", 10, "2026-09-01")]
    [InlineData("Bus pass", null, 10, "2026-09-01")]
    [InlineData("Bus pass", "   ", 10, "2026-09-01")]
    [InlineData("Bus pass", "Transit", 0, "2026-09-01")]
    [InlineData("Bus pass", "Transit", -1, "2026-09-01")]
    [InlineData("Bus pass", "Transit", 10, null)]
    public void UpsertExpenseDto_RejectsInvalidRequiredValues(
        string? title, string? category, decimal amount, string? date)
    {
        var dto = new UpsertExpenseDto
        {
            Title = title,
            Category = category,
            Amount = amount,
            Date = date is null ? null : DateTime.Parse(date)
        };

        Assert.False(Validator.TryValidateObject(dto, new ValidationContext(dto), [], true));
    }

    [Fact]
    public void UpsertContracts_DoNotAcceptUserId()
    {
        Assert.Null(typeof(UpsertExpenseDto).GetProperty("UserId"));
        Assert.Null(typeof(UpsertMonthlyBudgetDto).GetProperty("UserId"));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void UpsertMonthlyBudgetDto_RejectsNonPositiveAmount(decimal amount)
    {
        var dto = new UpsertMonthlyBudgetDto { Amount = amount };

        Assert.False(Validator.TryValidateObject(dto, new ValidationContext(dto), [], true));
    }

    [Fact]
    public void MoneyProperties_UseNumericDatabaseColumns()
    {
        using var db = TestDbContextFactory.Create();

        Assert.Equal("numeric", db.Model.FindEntityType(typeof(Expense))!
            .FindProperty(nameof(Expense.Amount))!.FindAnnotation("Relational:ColumnType")?.Value);
        Assert.Equal("numeric", db.Model.FindEntityType(typeof(MonthlyBudget))!
            .FindProperty(nameof(MonthlyBudget.Amount))!.FindAnnotation("Relational:ColumnType")?.Value);
    }
}
