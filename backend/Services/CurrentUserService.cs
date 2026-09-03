using backend.Auth;

namespace backend.Services;

public sealed class CurrentUserService(IHttpContextAccessor accessor) : ICurrentUserService
{
    public int UserId
    {
        get
        {
            var value = accessor.HttpContext?.User.FindFirst(AuthClaimTypes.UserId)?.Value;
            if (!int.TryParse(value, out var userId) || userId <= 0)
            {
                throw new UnauthorizedAccessException("An authenticated FocusFlow user is required.");
            }

            return userId;
        }
    }
}
