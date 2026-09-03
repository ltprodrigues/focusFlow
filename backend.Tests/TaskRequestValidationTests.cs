using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

public sealed class TaskRequestValidationTests : IClassFixture<TaskApiFactory>
{
    private readonly HttpClient client;
    public TaskRequestValidationTests(TaskApiFactory factory) => client = factory.CreateClient();

    public static IEnumerable<object[]> InvalidBodies()
    {
        yield return new object[] { new { title = "   ", course = "Math", dueDate = "2026-09-01T12:00:00Z", priority = "High" } };
        yield return new object[] { new { title = "Essay", course = "   ", dueDate = "2026-09-01T12:00:00Z", priority = "High" } };
        yield return new object[] { new { title = "Essay", course = "Math", priority = "High" } };
        yield return new object[] { new { title = "Essay", course = "Math", dueDate = "not-a-date", priority = "High" } };
        yield return new object[] { new { title = "Essay", course = "Math", dueDate = "2026-09-01T12:00:00Z" } };
        yield return new object[] { new { title = "Essay", course = "Math", dueDate = "2026-09-01T12:00:00Z", priority = "Urgent" } };
    }

    [Theory]
    [MemberData(nameof(InvalidBodies))]
    public async Task Post_InvalidRequiredFields_ReturnsValidationProblem(object body)
    {
        var response = await client.PostAsJsonAsync("/api/tasks", body);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.NotNull(await response.Content.ReadFromJsonAsync<ValidationProblemDetails>());
    }
}

public sealed class TaskApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("DemoUser:Id", "1");
        builder.ConfigureServices(services =>
        {
            var descriptors = services.Where(d => d.ServiceType == typeof(DbContextOptions<backend.Data.ApplicationDbContext>)).ToList();
            foreach (var descriptor in descriptors) services.Remove(descriptor);
            services.AddDbContext<backend.Data.ApplicationDbContext>(options => options.UseInMemoryDatabase(Guid.NewGuid().ToString()));
        });
    }
}
