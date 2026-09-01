using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Data;

public static class DevelopmentDataSeeder
{
    public static async Task SeedAsync(ApplicationDbContext db, int demoUserId)
    {
        if (!await db.Users.AnyAsync(user => user.Id == demoUserId))
        {
            db.Users.Add(new User
            {
                Id = demoUserId,
                Name = "FocusFlow Demo Student",
                Email = "demo@focusflow.local",
                PasswordHash = "development-only-no-login"
            });
            await db.SaveChangesAsync();
        }

        if (await db.StudyTasks.AnyAsync(task => task.UserId == demoUserId))
            return;

        var tomorrow = DateTime.UtcNow.Date.AddDays(1).AddHours(16);
        db.StudyTasks.AddRange(
            new StudyTask
            {
                UserId = demoUserId, Title = "Review lecture notes", Course = "Biology",
                DueDate = tomorrow, Priority = StudyTaskPriority.Medium
            },
            new StudyTask
            {
                UserId = demoUserId, Title = "Draft research outline", Course = "English",
                DueDate = tomorrow.AddDays(2).AddHours(2), Priority = StudyTaskPriority.High
            });

        await db.SaveChangesAsync();
    }
}
