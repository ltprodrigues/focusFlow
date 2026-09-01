using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Data;

public static class DevelopmentDataSeeder
{
    public static async Task SeedAsync(ApplicationDbContext db, int demoUserId)
    {
        if (await db.Users.AnyAsync(user => user.Id == demoUserId))
        {
            return;
        }

        db.Users.Add(new User
        {
            Id = demoUserId,
            Name = "FocusFlow Demo Student",
            Email = "demo@focusflow.local",
            PasswordHash = "development-only-no-login"
        });

        await db.SaveChangesAsync();
    }
}
