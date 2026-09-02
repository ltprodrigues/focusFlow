using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Data;

public static class DevelopmentDataSeeder
{
    public static async Task SeedAsync(ApplicationDbContext db, int demoUserId)
    {
        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var nextMonthStart = monthStart.AddMonths(1);

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

        if (!await db.StudyTasks.AnyAsync(task => task.UserId == demoUserId))
        {
            var tomorrow = now.Date.AddDays(1).AddHours(16);
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
        }

        if (!await db.MonthlyBudgets.AnyAsync(budget =>
                budget.UserId == demoUserId && budget.Year == now.Year && budget.Month == now.Month))
        {
            db.MonthlyBudgets.Add(new MonthlyBudget
            {
                UserId = demoUserId,
                Year = now.Year,
                Month = now.Month,
                Amount = 650m
            });
        }

        var demoExpenses = new[]
        {
            new Expense { UserId = demoUserId, Title = "Campus lunch", Amount = 14.50m, Category = "Food", Date = DemoDate(now, 3, 12) },
            new Expense { UserId = demoUserId, Title = "Transit pass", Amount = 42m, Category = "Transport", Date = DemoDate(now, 6, 9) },
            new Expense { UserId = demoUserId, Title = "Course reader", Amount = 36.75m, Category = "School", Date = DemoDate(now, 9, 15) },
            new Expense { UserId = demoUserId, Title = "Laundry", Amount = 8m, Category = "Other", Date = DemoDate(now, 12, 18) }
        };
        var existingTitles = await db.Expenses
            .Where(expense => expense.UserId == demoUserId
                && expense.Date >= monthStart && expense.Date < nextMonthStart
                && demoExpenses.Select(item => item.Title).Contains(expense.Title))
            .Select(expense => expense.Title)
            .ToListAsync();
        db.Expenses.AddRange(demoExpenses.Where(expense => !existingTitles.Contains(expense.Title)));

        await db.SaveChangesAsync();
    }

    private static DateTime DemoDate(DateTime now, int preferredDay, int hour) =>
        new(now.Year, now.Month, Math.Min(preferredDay, DateTime.DaysInMonth(now.Year, now.Month)), hour, 0, 0, DateTimeKind.Utc);
}
