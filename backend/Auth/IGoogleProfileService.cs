using backend.Models;

namespace backend.Auth;

public interface IGoogleProfileService
{
    Task<User> UpsertAsync(
        GoogleProfile profile,
        string timeZone,
        CancellationToken cancellationToken);
}
