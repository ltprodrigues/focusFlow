using Microsoft.Extensions.Configuration;

namespace backend.Services;

public sealed class DemoCurrentUserService : ICurrentUserService
{
    public DemoCurrentUserService(IConfiguration configuration)
    {
        UserId = configuration.GetValue<int>("DemoUser:Id");
        if (UserId <= 0)
            throw new InvalidOperationException("DemoUser:Id must be a positive integer.");
    }

    public int UserId { get; }
}
