using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using backend.Data;
using backend.Models;
using backend.DTOs;


namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ExpensesController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly backend.Services.ICurrentUserService _currentUser;

    public ExpensesController(ApplicationDbContext context, backend.Services.ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }


    [HttpGet]
    public async Task<ActionResult<List<Expense>>> GetExpenses()
    {
        return await _context.Expenses.ToListAsync();
    }


    [HttpGet("{id}")]
    public async Task<ActionResult<Expense>> GetExpense(int id)
    {
        var expense = await _context.Expenses.FindAsync(id);

        if (expense == null)
            return NotFound();

        return expense;
    }

    [HttpPost]
    public async Task<ActionResult<Expense>> CreateExpense(UpsertExpenseDto request)
    {
        var expense = new Expense
        {
            Title = request.Title!,
            Amount = request.Amount,
            Category = request.Category!,
            Date = request.Date!.Value,
            Notes = request.Notes,
            UserId = _currentUser.UserId
        };

        _context.Expenses.Add(expense);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetExpense), new { id = expense.Id }, expense);
    }


    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateExpense(
        int id,
        Expense expense)
    {
        if (id != expense.Id)
            return BadRequest();


        _context.Entry(expense).State =
            EntityState.Modified;


        await _context.SaveChangesAsync();


        return NoContent();
    }


    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteExpense(int id)
    {
        var expense =
            await _context.Expenses.FindAsync(id);


        if (expense == null)
            return NotFound();


        _context.Expenses.Remove(expense);

        await _context.SaveChangesAsync();


        return NoContent();
    }
}
