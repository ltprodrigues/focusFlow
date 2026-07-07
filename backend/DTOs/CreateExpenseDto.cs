namespace backend.DTOs;

public class CreateExpenseDto
{
    public string Title { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public string Category { get; set; } = string.Empty;

    public DateTime Date { get; set; }

    public int UserId { get; set; }
}