using Microsoft.Extensions.Configuration;

namespace backend.Services;

public sealed class DemoCurrentUserService(IConfiguration configuration)
    : ICurrentUserService
{
    public int UserId { get; } = configuration.GetValue<int>("DemoUser:Id");
}
