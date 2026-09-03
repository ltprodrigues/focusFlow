using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Authorize]
[Route("api/budgets")]
public sealed class BudgetsController(
    ApplicationDbContext db,
    ICurrentUserService currentUser) : ControllerBase
{
    [HttpGet("{year:int}/{month:int}")]
    public async Task<ActionResult<UpsertMonthlyBudgetDto>> GetBudget(
        int year,
        int month,
        CancellationToken cancellationToken = default)
    {
        if (!IsValidPeriod(year, month))
            return InvalidPeriod();

        var amount = await db.MonthlyBudgets
            .AsNoTracking()
            .Where(budget =>
                budget.UserId == currentUser.UserId &&
                budget.Year == year &&
                budget.Month == month)
            .Select(budget => (decimal?)budget.Amount)
            .SingleOrDefaultAsync(cancellationToken);

        return amount.HasValue
            ? new UpsertMonthlyBudgetDto { Amount = amount.Value }
            : NoContent();
    }

    [HttpPut("{year:int}/{month:int}")]
    public async Task<ActionResult<UpsertMonthlyBudgetDto>> PutBudget(
        int year,
        int month,
        UpsertMonthlyBudgetDto request,
        CancellationToken cancellationToken = default)
    {
        if (!IsValidPeriod(year, month))
            return InvalidPeriod();

        if (request.Amount <= 0)
            return ValidationProblem(
                detail: "Amount must be greater than zero.",
                statusCode: StatusCodes.Status400BadRequest);

        var budget = await db.MonthlyBudgets.SingleOrDefaultAsync(
            budget =>
                budget.UserId == currentUser.UserId &&
                budget.Year == year &&
                budget.Month == month,
            cancellationToken);

        var inserted = false;
        if (budget is null)
        {
            inserted = true;
            budget = new MonthlyBudget
            {
                UserId = currentUser.UserId,
                Year = year,
                Month = month,
                Amount = request.Amount
            };
            db.MonthlyBudgets.Add(budget);
        }
        else
        {
            budget.Amount = request.Amount;
        }

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException) when (inserted)
        {
            // A concurrent request can insert the same unique user/year/month key
            // after our read. Detach the failed insert and update the winning row.
            db.Entry(budget).State = EntityState.Detached;
            budget = await db.MonthlyBudgets.SingleOrDefaultAsync(
                candidate =>
                    candidate.UserId == currentUser.UserId &&
                    candidate.Year == year &&
                    candidate.Month == month,
                cancellationToken);

            if (budget is null)
                throw;

            budget.Amount = request.Amount;
            await db.SaveChangesAsync(cancellationToken);
        }

        return new UpsertMonthlyBudgetDto { Amount = budget.Amount };
    }

    private static bool IsValidPeriod(int year, int month) =>
        year is >= 1 and <= 9998 && month is >= 1 and <= 12;

    private ActionResult InvalidPeriod() => ValidationProblem(
        detail: "Year must be between 1 and 9998 and month must be between 1 and 12.",
        statusCode: StatusCodes.Status400BadRequest);
}
