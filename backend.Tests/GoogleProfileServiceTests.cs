using backend.Auth;
using backend.Data;
using backend.Models;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

public sealed class GoogleProfileServiceTests
{
    [Fact]
    public async Task UpsertAsync_CreatesOnceByGoogleSubjectAndRefreshesProfile()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new GoogleProfileService(db);

        await service.UpsertAsync(
            new GoogleProfile("google-123", " Student@Example.com ", "Student", null),
            "America/Toronto", default);
        var updated = await service.UpsertAsync(
            new GoogleProfile("google-123", "student@example.com", "Updated Student", "https://example.test/photo"),
            "America/Toronto", default);

        var user = Assert.Single(db.Users);
        Assert.Equal(user.Id, updated.Id);
        Assert.Equal("student@example.com", user.Email);
        Assert.Equal("Updated Student", user.Name);
        Assert.Equal("https://example.test/photo", user.PictureUrl);
    }

    [Theory]
    [InlineData("", "student@example.com")]
    [InlineData("google-123", "")]
    public async Task UpsertAsync_RejectsMissingRequiredProviderIdentity(string subject, string email)
    {
        await using var db = TestDbContextFactory.Create();
        var service = new GoogleProfileService(db);

        await Assert.ThrowsAsync<ArgumentException>(() => service.UpsertAsync(
            new GoogleProfile(subject, email, "Student", null), "America/Toronto", default));
    }

    [Fact]
    public async Task UpsertAsync_RejectsEmailAlreadyLinkedToDifferentGoogleSubject()
    {
        await using var db = TestDbContextFactory.Create();
        db.Users.Add(new User
        {
            GoogleSubject = "google-first",
            Email = "student@example.com",
            Name = "Student"
        });
        await db.SaveChangesAsync();
        var service = new GoogleProfileService(db);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpsertAsync(
            new GoogleProfile("google-second", "STUDENT@example.com", "Other", null),
            "America/Toronto", default));
    }

    [Fact]
    public async Task UpsertAsync_FallsBackToTorontoForUnknownTimeZone()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new GoogleProfileService(db);

        var user = await service.UpsertAsync(
            new GoogleProfile("google-123", "student@example.com", "Student", null),
            "Not/A-Time-Zone", default);

        Assert.Equal("America/Toronto", user.TimeZone);
    }

    [Fact]
    public async Task UpsertAsync_HonorsCancellation()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new GoogleProfileService(db);
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => service.UpsertAsync(
            new GoogleProfile("google-123", "student@example.com", "Student", null),
            "America/Toronto", cancellation.Token));
    }

    [Fact]
    public async Task UpsertAsync_RecoversWhenAnotherCallbackCreatesTheSameGoogleSubject()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var plainOptions = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(connection).Options;
        await using (var setup = new ApplicationDbContext(plainOptions))
            await setup.Database.EnsureCreatedAsync();

        var interceptor = new CompetingGoogleUserInterceptor(plainOptions);
        var racingOptions = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(connection).AddInterceptors(interceptor).Options;
        await using var db = new ApplicationDbContext(racingOptions);
        var service = new GoogleProfileService(db);

        var user = await service.UpsertAsync(
            new GoogleProfile("google-race", "student@example.com", "Requested Name", null),
            "America/Toronto", default);

        Assert.True(interceptor.InsertedCompetingUser);
        Assert.Equal("Requested Name", user.Name);
        await using var verification = new ApplicationDbContext(plainOptions);
        Assert.Equal("Requested Name", (await verification.Users.SingleAsync()).Name);
    }

    private sealed class CompetingGoogleUserInterceptor(
        DbContextOptions<ApplicationDbContext> competitorOptions) : SaveChangesInterceptor
    {
        public bool InsertedCompetingUser { get; private set; }

        public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
        {
            if (InsertedCompetingUser
                || eventData.Context is not ApplicationDbContext context
                || !context.ChangeTracker.Entries<User>().Any(entry => entry.State == EntityState.Added))
                return result;

            InsertedCompetingUser = true;
            await using var competitor = new ApplicationDbContext(competitorOptions);
            competitor.Users.Add(new User
            {
                GoogleSubject = "google-race",
                Email = "student@example.com",
                Name = "Competing Name"
            });
            await competitor.SaveChangesAsync(cancellationToken);
            return result;
        }
    }
}
