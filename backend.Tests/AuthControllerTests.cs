using backend.Controllers;
using backend.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

public sealed class AuthControllerTests
{
    [Theory]
    [InlineData("https://evil.example/steal")]
    [InlineData("//evil.example/steal")]
    [InlineData("/\\evil")]
    public void Login_RejectsExternalReturnUrl(string returnUrl)
    {
        using var db = TestDbContextFactory.Create();
        var controller = CreateController(db);

        var result = Assert.IsType<ChallengeResult>(controller.Login(returnUrl, "America/Toronto"));

        Assert.Equal("http://localhost:5173/", result.Properties!.RedirectUri);
    }

    [Fact]
    public void Login_PreservesLocalReturnUrlAndTimeZone()
    {
        using var db = TestDbContextFactory.Create();
        var controller = CreateController(db);

        var result = Assert.IsType<ChallengeResult>(controller.Login("/assignments", "America/Vancouver"));

        Assert.Equal("http://localhost:5173/assignments", result.Properties!.RedirectUri);
        Assert.Equal("America/Vancouver", result.Properties.Items["focusflow:time_zone"]);
    }

    private static AuthController CreateController(ApplicationDbContext db)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                ["Authentication:Google:FrontendUrl"] = "http://localhost:5173"
            }).Build();
        return new AuthController(db, null!, null!, configuration);
    }
}
