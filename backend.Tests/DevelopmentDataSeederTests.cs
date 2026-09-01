using backend.Data;
using Microsoft.EntityFrameworkCore;

public class DevelopmentDataSeederTests
{
    [Fact]
    public async Task SeedAsync_CreatesDemoUserOnce()
    {
        await using var db = TestDbContextFactory.Create();

        await DevelopmentDataSeeder.SeedAsync(db, 1);
        await DevelopmentDataSeeder.SeedAsync(db, 1);

        Assert.Single(db.Users.Where(user => user.Id == 1));
    }

    [Fact]
    public async Task SeedAsync_CreatesSmallTaskSetOnce()
    {
        await using var db = TestDbContextFactory.Create();
        await DevelopmentDataSeeder.SeedAsync(db, 1);
        await DevelopmentDataSeeder.SeedAsync(db, 1);
        Assert.InRange(await db.StudyTasks.CountAsync(task => task.UserId == 1), 2, 4);
    }
}
