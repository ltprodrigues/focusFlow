using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Expense> Expenses { get; set; }
    public DbSet<MonthlyBudget> MonthlyBudgets { get; set; }
    public DbSet<StudyTask> StudyTasks { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<StudyTask>(entity =>
        {
            entity.Property(task => task.Priority)
                .HasConversion<string>()
                .HasDefaultValue(StudyTaskPriority.Low);
            entity.HasIndex(task => new { task.UserId, task.DueDate });
        });

        modelBuilder.Entity<Expense>(entity =>
        {
            entity.Property(expense => expense.Amount).HasColumnType("numeric");
            entity.HasIndex(expense => new { expense.UserId, expense.Date });
        });

        modelBuilder.Entity<MonthlyBudget>(entity =>
        {
            entity.Property(budget => budget.Amount).HasColumnType("numeric");
            entity.HasIndex(budget => new { budget.UserId, budget.Year, budget.Month })
                .IsUnique();
        });
    }
}
