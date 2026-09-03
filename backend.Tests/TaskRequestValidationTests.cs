using System.Net;
using System.Net.Http.Json;
using backend.DTOs;
using Microsoft.AspNetCore.Mvc;

public sealed class TaskRequestValidationTests : IClassFixture<AuthenticatedApiFactory>
{
    private readonly AuthenticatedApiFactory factory;
    private readonly HttpClient client;
    public TaskRequestValidationTests(AuthenticatedApiFactory factory)
    {
        this.factory = factory;
        client = factory.CreateAuthenticatedClient(1);
    }

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
        await factory.EnsureUserAsync(1, "validation@example.com");
        var profile = await client.GetFromJsonAsync<CurrentUserDto>("/api/auth/me");
        client.DefaultRequestHeaders.Add("X-FocusFlow-CSRF", profile!.AntiforgeryToken);
        var response = await client.PostAsJsonAsync("/api/tasks", body);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.NotNull(await response.Content.ReadFromJsonAsync<ValidationProblemDetails>());
    }
}
