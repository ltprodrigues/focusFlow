using backend.Services;

public sealed class FakeCurrentUserService(int userId) : ICurrentUserService
{
    public int UserId { get; set; } = userId;
}
