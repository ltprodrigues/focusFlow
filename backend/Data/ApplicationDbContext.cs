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
    }
}
