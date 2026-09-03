using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/expenses")]
public sealed class ExpensesController(
    ApplicationDbContext db,
    ICurrentUserService currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<ExpenseDto>>> GetExpenses(
        int year,
        int month,
        CancellationToken cancellationToken = default)
    {
        if (!IsValidPeriod(year, month))
            return InvalidPeriod();

        var start = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        var end = start.AddMonths(1);

        return await db.Expenses
            .AsNoTracking()
            .Where(expense =>
                expense.UserId == currentUser.UserId &&
                expense.Date >= start &&
                expense.Date < end)
            .OrderByDescending(expense => expense.Date)
            .ThenByDescending(expense => expense.Id)
            .Select(expense => ToDto(expense))
            .ToListAsync(cancellationToken);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ExpenseDto>> GetExpense(
        int id,
        CancellationToken cancellationToken = default)
    {
        var expense = await db.Expenses
            .AsNoTracking()
            .Where(expense => expense.Id == id && expense.UserId == currentUser.UserId)
            .Select(expense => ToDto(expense))
            .SingleOrDefaultAsync(cancellationToken);

        return expense is null ? NotFound() : expense;
    }

    [HttpPost]
    public async Task<ActionResult<ExpenseDto>> CreateExpense(
        UpsertExpenseDto request,
        CancellationToken cancellationToken = default)
    {
        var expense = new Expense
        {
            Title = request.Title!,
            Amount = request.Amount,
            Category = request.Category!,
            Date = request.Date!.Value,
            Notes = request.Notes,
            UserId = currentUser.UserId
        };

        db.Expenses.Add(expense);
        await db.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetExpense), new { id = expense.Id }, ToDto(expense));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateExpense(
        int id,
        UpsertExpenseDto request,
        CancellationToken cancellationToken = default)
    {
        var expense = await db.Expenses.SingleOrDefaultAsync(
            expense => expense.Id == id && expense.UserId == currentUser.UserId,
            cancellationToken);

        if (expense is null)
            return NotFound();

        expense.Title = request.Title!;
        expense.Amount = request.Amount;
        expense.Category = request.Category!;
        expense.Date = request.Date!.Value;
        expense.Notes = request.Notes;

        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteExpense(
        int id,
        CancellationToken cancellationToken = default)
    {
        var expense = await db.Expenses.SingleOrDefaultAsync(
            expense => expense.Id == id && expense.UserId == currentUser.UserId,
            cancellationToken);

        if (expense is null)
            return NotFound();

        db.Expenses.Remove(expense);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private static ExpenseDto ToDto(Expense expense) => new(
        expense.Id,
        expense.Title,
        expense.Amount,
        expense.Category,
        expense.Date,
        expense.Notes);

    private static bool IsValidPeriod(int year, int month) =>
        year is >= 1 and <= 9998 && month is >= 1 and <= 12;

    private ActionResult InvalidPeriod() => ValidationProblem(
        detail: "Year must be between 1 and 9998 and month must be between 1 and 12.",
        statusCode: StatusCodes.Status400BadRequest);
}
