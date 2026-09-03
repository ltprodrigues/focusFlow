using backend.Data;
using backend.DTOs;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public sealed class FinanceSummaryService(ApplicationDbContext db) : IFinanceSummaryService
{
    public async Task<FinanceSummaryDto> GetAsync(
        int userId,
        int year,
        int month,
        CancellationToken cancellationToken)
    {
        var start = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        var end = start.AddMonths(1);

        var budget = await db.MonthlyBudgets
            .AsNoTracking()
            .Where(item => item.UserId == userId && item.Year == year && item.Month == month)
            .Select(item => (decimal?)item.Amount)
            .SingleOrDefaultAsync(cancellationToken);

        var categoryTotals = await db.Expenses
            .AsNoTracking()
            .Where(item => item.UserId == userId && item.Date >= start && item.Date < end)
            .GroupBy(item => item.Category)
            .Select(group => new { Category = group.Key, Amount = group.Sum(item => item.Amount) })
            .OrderByDescending(item => item.Amount)
            .ThenBy(item => item.Category)
            .ToListAsync(cancellationToken);

        var categories = categoryTotals
            .Select(item => new CategoryTotalDto(item.Category, item.Amount))
            .ToList();
        var totalSpent = categories.Sum(item => item.Amount);
        var budgetAmount = budget ?? 0m;

        return new FinanceSummaryDto(
            year,
            month,
            budgetAmount,
            totalSpent,
            budgetAmount - totalSpent,
            totalSpent > budgetAmount,
            budget.HasValue,
            categories);
    }
}
