using System.Net;
using System.Net.Http.Json;
using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

public sealed class AuthenticatedApiTests : IClassFixture<AuthenticatedApiFactory>
{
    private readonly AuthenticatedApiFactory factory;

    public AuthenticatedApiTests(AuthenticatedApiFactory factory) => this.factory = factory;

    [Fact]
    public async Task Tasks_WithoutCookie_ReturnsUnauthorized()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/tasks");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_ReturnsProfileAndAntiforgeryTokenForAuthenticatedUser()
    {
        await factory.EnsureUserAsync(7, "student@example.com");
        using var client = factory.CreateAuthenticatedClient(7);

        var profile = await client.GetFromJsonAsync<CurrentUserDto>("/api/auth/me");

        Assert.Equal(7, profile!.Id);
        Assert.Equal("student@example.com", profile.Email);
        Assert.False(string.IsNullOrWhiteSpace(profile.AntiforgeryToken));
    }

    [Fact]
    public async Task UnsafeRequest_RequiresAntiforgeryToken()
    {
        await factory.EnsureUserAsync(8, "second@example.com");
        using var client = factory.CreateAuthenticatedClient(8);
        var payload = new
        {
            title = "Essay",
            course = "English",
            dueDate = "2026-09-10T12:00:00Z",
            priority = "High"
        };

        var rejected = await client.PostAsJsonAsync("/api/tasks", payload);
        var profile = await client.GetFromJsonAsync<CurrentUserDto>("/api/auth/me");
        client.DefaultRequestHeaders.Add("X-FocusFlow-CSRF", profile!.AntiforgeryToken);
        var accepted = await client.PostAsJsonAsync("/api/tasks", payload);

        Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);
        Assert.Equal(HttpStatusCode.Created, accepted.StatusCode);
    }
}

public sealed class AuthenticatedApiFactory : WebApplicationFactory<Program>
{
    private readonly string databaseName = $"auth-{Guid.NewGuid()}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<ApplicationDbContext>();
            services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<ApplicationDbContext>>();
            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseInMemoryDatabase(databaseName));
            services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                    options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
                })
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                    TestAuthHandler.SchemeName, _ => { });
        });
    }

    public HttpClient CreateAuthenticatedClient(int userId)
    {
        var client = CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            HandleCookies = true,
            BaseAddress = new Uri("https://localhost")
        });
        client.DefaultRequestHeaders.Add(TestAuthHandler.UserHeader, userId.ToString());
        return client;
    }

    public async Task EnsureUserAsync(int id, string email)
    {
        await using var scope = Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        if (!await db.Users.AnyAsync(user => user.Id == id))
        {
            db.Users.Add(new User
            {
                Id = id,
                GoogleSubject = $"google-{id}",
                Email = email,
                Name = $"Student {id}"
            });
            await db.SaveChangesAsync();
        }
    }
}
