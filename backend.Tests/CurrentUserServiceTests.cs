using System.Security.Claims;
using backend.Auth;
using backend.Services;
using Microsoft.AspNetCore.Http;

public sealed class CurrentUserServiceTests
{
    [Fact]
    public void UserId_ReadsPositiveInternalClaim()
    {
        var context = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity(
                [new Claim(AuthClaimTypes.UserId, "42")], "Test"))
        };
        var service = new CurrentUserService(new HttpContextAccessor { HttpContext = context });

        Assert.Equal(42, service.UserId);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("0")]
    [InlineData("not-an-id")]
    public void UserId_RejectsMissingOrInvalidInternalClaim(string? value)
    {
        var claims = value is null ? [] : new[] { new Claim(AuthClaimTypes.UserId, value) };
        var context = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"))
        };
        var service = new CurrentUserService(new HttpContextAccessor { HttpContext = context });

        Assert.Throws<UnauthorizedAccessException>(() => service.UserId);
    }
}
