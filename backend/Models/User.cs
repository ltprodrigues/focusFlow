namespace backend.Models;

public class User
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string? GoogleSubject { get; set; }

    public string? PictureUrl { get; set; }

    public string TimeZone { get; set; } = "America/Toronto";

    public string PasswordHash { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<Expense> Expenses { get; set; } = new();

    public List<MonthlyBudget> MonthlyBudgets { get; set; } = new();

    public List<StudyTask> StudyTasks { get; set; } = new();
}
