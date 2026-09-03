namespace backend.Models;

public class StudyTask
{
    public int Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Course { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string? Notes { get; set; }

    public DateTime DueDate { get; set; }

    public bool IsCompleted { get; set; } = false;

    public StudyTaskPriority Priority { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;


    // Relationship with User
    public int UserId { get; set; }

    public User User { get; set; } = null!;
}
