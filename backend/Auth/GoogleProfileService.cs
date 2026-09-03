using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Auth;

public sealed class GoogleProfileService(ApplicationDbContext db) : IGoogleProfileService
{
    private const string DefaultTimeZone = "America/Toronto";

    public async Task<User> UpsertAsync(
        GoogleProfile profile,
        string timeZone,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var subject = Require(profile.Subject, "Google subject");
        var email = Require(profile.Email, "Google email").ToLowerInvariant();
        var name = string.IsNullOrWhiteSpace(profile.Name)
            ? email.Split('@')[0]
            : profile.Name.Trim();
        var pictureUrl = string.IsNullOrWhiteSpace(profile.PictureUrl)
            ? null
            : profile.PictureUrl.Trim();
        var normalizedTimeZone = NormalizeTimeZone(timeZone);

        var user = await db.Users.SingleOrDefaultAsync(
            candidate => candidate.GoogleSubject == subject,
            cancellationToken);
        var emailOwner = await db.Users.SingleOrDefaultAsync(
            candidate => candidate.Email.ToLower() == email,
            cancellationToken);

        if (emailOwner is not null && emailOwner.GoogleSubject != subject)
        {
            throw new InvalidOperationException("This Google identity cannot be linked to the requested profile.");
        }

        var creating = user is null;
        if (creating)
        {
            user = new User
            {
                GoogleSubject = subject,
                Email = email,
                Name = name,
                PictureUrl = pictureUrl,
                TimeZone = normalizedTimeZone
            };
            db.Users.Add(user);
        }
        else
        {
            ApplyProfile(user!, email, name, pictureUrl, normalizedTimeZone);
        }

        try
        {
            await db.SaveChangesAsync(cancellationToken);
            return user!;
        }
        catch (DbUpdateException) when (creating)
        {
            db.Entry(user!).State = EntityState.Detached;
            var winner = await db.Users.SingleOrDefaultAsync(
                candidate => candidate.GoogleSubject == subject,
                cancellationToken);
            if (winner is null)
            {
                throw;
            }

            var emailBelongsToAnotherUser = await db.Users.AnyAsync(
                candidate => candidate.Email.ToLower() == email && candidate.Id != winner.Id,
                cancellationToken);
            if (emailBelongsToAnotherUser)
            {
                throw new InvalidOperationException(
                    "This Google identity cannot be linked to the requested profile.");
            }

            ApplyProfile(winner, email, name, pictureUrl, normalizedTimeZone);
            await db.SaveChangesAsync(cancellationToken);
            return winner;
        }
    }

    private static string Require(string value, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException($"{fieldName} is required.");
        }

        return value.Trim();
    }

    private static void ApplyProfile(
        User user,
        string email,
        string name,
        string? pictureUrl,
        string timeZone)
    {
        user.Email = email;
        user.Name = name;
        user.PictureUrl = pictureUrl;
        user.TimeZone = timeZone;
    }

    private static string NormalizeTimeZone(string? requested)
    {
        foreach (var candidate in new[] { requested, DefaultTimeZone, "Eastern Standard Time" }
                     .Where(value => !string.IsNullOrWhiteSpace(value))
                     .Distinct(StringComparer.OrdinalIgnoreCase))
        {
            try
            {
                _ = TimeZoneInfo.FindSystemTimeZoneById(candidate!);
                return candidate == "Eastern Standard Time" ? DefaultTimeZone : candidate!;
            }
            catch (TimeZoneNotFoundException) { }
            catch (InvalidTimeZoneException) { }
        }

        return DefaultTimeZone;
    }
}
