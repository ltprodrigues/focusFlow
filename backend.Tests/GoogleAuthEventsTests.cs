using System.Security.Claims;
using backend.Auth;
using Microsoft.Extensions.Configuration;

public sealed class GoogleAuthEventsTests
{
    [Fact]
    public async Task SynchronizeAsync_RequiresProviderSubjectAndEmail()
    {
        var service = new RecordingGoogleProfileService();
        var events = CreateEvents(service);
        var principal = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim(ClaimTypes.Name, "Student")], "Google"));

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            events.SynchronizeAsync(principal, null, default));
        Assert.Null(service.Profile);
    }

    [Fact]
    public async Task SynchronizeAsync_UpsertsProfileAndAddsInternalUserClaim()
    {
        var service = new RecordingGoogleProfileService();
        var events = CreateEvents(service);
        var principal = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, "google-123"),
            new Claim(ClaimTypes.Email, "Student@Example.com"),
            new Claim(ClaimTypes.Name, "Student Name"),
            new Claim("urn:google:picture", "https://example.test/photo")
        ], "Google"));

        await events.SynchronizeAsync(principal, "America/Vancouver", default);

        Assert.Equal("google-123", service.Profile?.Subject);
        Assert.Equal("Student@Example.com", service.Profile?.Email);
        Assert.Equal("America/Vancouver", service.TimeZone);
        Assert.Equal("42", principal.FindFirstValue(AuthClaimTypes.UserId));
    }

    private static GoogleAuthEvents CreateEvents(IGoogleProfileService service) => new(
        service,
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Authentication:Google:DefaultTimeZone"] = "America/Toronto"
        }).Build());

    private sealed class RecordingGoogleProfileService : IGoogleProfileService
    {
        public GoogleProfile? Profile { get; private set; }
        public string? TimeZone { get; private set; }

        public Task<backend.Models.User> UpsertAsync(
            GoogleProfile profile, string timeZone, CancellationToken cancellationToken)
        {
            Profile = profile;
            TimeZone = timeZone;
            return Task.FromResult(new backend.Models.User
            {
                Id = 42,
                GoogleSubject = profile.Subject,
                Email = profile.Email,
                Name = profile.Name
            });
        }
    }
}
