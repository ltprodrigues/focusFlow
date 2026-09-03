using backend.Data;
using backend.DTOs;
using backend.Services;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(
    ApplicationDbContext db,
    ICurrentUserService currentUser,
    IAntiforgery antiforgery,
    IConfiguration configuration) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("google/login")]
    public IActionResult Login(string returnUrl = "/", string? timeZone = null)
    {
        var safeReturnUrl = IsLocalPath(returnUrl) ? returnUrl : "/";
        var frontendUrl = configuration["Authentication:Google:FrontendUrl"]
            ?? "http://localhost:5173";
        var properties = new AuthenticationProperties
        {
            RedirectUri = $"{frontendUrl.TrimEnd('/')}{safeReturnUrl}"
        };
        properties.Items["focusflow:time_zone"] = timeZone
            ?? configuration["Authentication:Google:DefaultTimeZone"]
            ?? "America/Toronto";

        return Challenge(properties, GoogleDefaults.AuthenticationScheme);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<CurrentUserDto>> Me(CancellationToken cancellationToken)
    {
        var user = await db.Users.AsNoTracking().SingleOrDefaultAsync(
            candidate => candidate.Id == currentUser.UserId,
            cancellationToken);
        if (user is null)
        {
            return Unauthorized();
        }

        var requestToken = antiforgery.GetAndStoreTokens(HttpContext).RequestToken;
        if (string.IsNullOrWhiteSpace(requestToken))
        {
            throw new InvalidOperationException("An antiforgery request token could not be created.");
        }

        return new CurrentUserDto(
            user.Id,
            user.Name,
            user.Email,
            user.PictureUrl,
            user.TimeZone,
            requestToken);
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    private static bool IsLocalPath(string? value) =>
        !string.IsNullOrWhiteSpace(value)
        && value[0] == '/'
        && (value.Length == 1 || value[1] != '/')
        && !value.Contains('\\');
}
