namespace backend.Models;

public sealed class MonthlyBudget
{
    public int Id { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal Amount { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
}
