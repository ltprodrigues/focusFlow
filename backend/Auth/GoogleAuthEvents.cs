using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.OAuth;

namespace backend.Auth;

public sealed class GoogleAuthEvents(
    IGoogleProfileService profiles,
    IConfiguration configuration) : OAuthEvents
{
    private const string PictureClaim = "urn:google:picture";

    public override async Task CreatingTicket(OAuthCreatingTicketContext context)
    {
        context.Properties.Items.TryGetValue("focusflow:time_zone", out var timeZone);
        await SynchronizeAsync(context.Principal!, timeZone, context.HttpContext.RequestAborted);
    }

    public override Task RemoteFailure(RemoteFailureContext context)
    {
        var frontendUrl = configuration["Authentication:Google:FrontendUrl"]
            ?? "http://localhost:5173";
        context.Response.Redirect($"{frontendUrl.TrimEnd('/')}/login?error=google");
        context.HandleResponse();
        return Task.CompletedTask;
    }

    public async Task SynchronizeAsync(
        ClaimsPrincipal principal,
        string? requestedTimeZone,
        CancellationToken cancellationToken)
    {
        var subject = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        var email = principal.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrWhiteSpace(subject) || string.IsNullOrWhiteSpace(email))
        {
            throw new InvalidOperationException("Google did not provide the required identity claims.");
        }

        var defaultTimeZone = configuration["Authentication:Google:DefaultTimeZone"]
            ?? "America/Toronto";
        var user = await profiles.UpsertAsync(
            new GoogleProfile(
                subject,
                email,
                principal.FindFirstValue(ClaimTypes.Name) ?? string.Empty,
                principal.FindFirstValue(PictureClaim)),
            string.IsNullOrWhiteSpace(requestedTimeZone) ? defaultTimeZone : requestedTimeZone,
            cancellationToken);

        if (principal.Identity is not ClaimsIdentity identity)
        {
            throw new InvalidOperationException("Google identity is unavailable.");
        }

        foreach (var existing in identity.FindAll(AuthClaimTypes.UserId).ToList())
        {
            identity.RemoveClaim(existing);
        }
        identity.AddClaim(new Claim(AuthClaimTypes.UserId, user.Id.ToString()));
    }
}
