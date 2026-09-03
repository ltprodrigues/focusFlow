using backend.Services;
using Microsoft.Extensions.Configuration;

public class DemoCurrentUserServiceTests
{
    [Fact]
    public void UserId_UsesConfiguredDemoUser()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["DemoUser:Id"] = "7"
            }).Build();

        var service = new DemoCurrentUserService(config);

        Assert.Equal(7, service.UserId);
    }

    [Fact]
    public void Constructor_RejectsMissingDemoUser()
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection().Build();
        Assert.Throws<InvalidOperationException>(() => new DemoCurrentUserService(config));
    }
}
