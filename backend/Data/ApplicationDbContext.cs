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

        modelBuilder.Entity<User>(entity =>
        {
            entity.Property(user => user.GoogleSubject).HasMaxLength(255);
            entity.Property(user => user.Email).HasMaxLength(320);
            entity.Property(user => user.Name).HasMaxLength(160);
            entity.Property(user => user.PictureUrl).HasMaxLength(2048);
            entity.Property(user => user.TimeZone)
                .HasMaxLength(100)
                .HasDefaultValue("America/Toronto");
            entity.HasIndex(user => user.GoogleSubject)
                .IsUnique();
            entity.HasIndex(user => user.Email).IsUnique();
        });

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
