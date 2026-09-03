using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Data;

public static class DevelopmentDataSeeder
{
    public static async Task SeedAsync(ApplicationDbContext db, int demoUserId, DateTimeOffset? utcNow = null, string timeZoneId = "America/Toronto")
    {
        var timeZone = ResolveTimeZone(timeZoneId);
        var instant = utcNow ?? DateTimeOffset.UtcNow;
        var localNow = TimeZoneInfo.ConvertTime(instant, timeZone);
        var localMonthStart = new DateTime(localNow.Year, localNow.Month, 1, 0, 0, 0, DateTimeKind.Unspecified);
        var monthStart = TimeZoneInfo.ConvertTimeToUtc(localMonthStart, timeZone);
        var nextMonthStart = TimeZoneInfo.ConvertTimeToUtc(localMonthStart.AddMonths(1), timeZone);

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
            var tomorrow = instant.UtcDateTime.Date.AddDays(1).AddHours(16);
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
                budget.UserId == demoUserId && budget.Year == localNow.Year && budget.Month == localNow.Month))
        {
            db.MonthlyBudgets.Add(new MonthlyBudget
            {
                UserId = demoUserId,
                Year = localNow.Year,
                Month = localNow.Month,
                Amount = 650m
            });
        }

        var demoExpenses = new[]
        {
            new Expense { UserId = demoUserId, Title = "Campus lunch", Amount = 14.50m, Category = "Food", Date = DemoDate(localNow.Year, localNow.Month, 3, 12, timeZone) },
            new Expense { UserId = demoUserId, Title = "Transit pass", Amount = 42m, Category = "Transport", Date = DemoDate(localNow.Year, localNow.Month, 6, 9, timeZone) },
            new Expense { UserId = demoUserId, Title = "Course reader", Amount = 36.75m, Category = "School", Date = DemoDate(localNow.Year, localNow.Month, 9, 15, timeZone) },
            new Expense { UserId = demoUserId, Title = "Laundry", Amount = 8m, Category = "Other", Date = DemoDate(localNow.Year, localNow.Month, 12, 18, timeZone) }
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

    private static DateTime DemoDate(int year, int month, int preferredDay, int hour, TimeZoneInfo timeZone)
    {
        var local = new DateTime(year, month, Math.Min(preferredDay, DateTime.DaysInMonth(year, month)), hour, 0, 0, DateTimeKind.Unspecified);
        return TimeZoneInfo.ConvertTimeToUtc(local, timeZone);
    }

    private static TimeZoneInfo ResolveTimeZone(string configuredId)
    {
        foreach (var id in new[] { configuredId, "America/Toronto", "Eastern Standard Time" }.Distinct())
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById(id); }
            catch (TimeZoneNotFoundException) { }
            catch (InvalidTimeZoneException) { }
        }
        throw new InvalidOperationException($"Development time zone '{configuredId}' is unavailable.");
    }
}
