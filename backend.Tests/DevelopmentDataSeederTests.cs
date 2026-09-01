using backend.Data;

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
}
