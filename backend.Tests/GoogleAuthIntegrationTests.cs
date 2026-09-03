using System.Net;
using System.Net.Http.Json;
using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

public sealed class GoogleAuthIntegrationTests : IClassFixture<AuthenticatedApiFactory>
{
    private readonly AuthenticatedApiFactory factory;

    public GoogleAuthIntegrationTests(AuthenticatedApiFactory factory) => this.factory = factory;

    [Theory]
    [InlineData("/api/tasks")]
    [InlineData("/api/expenses?year=2026&month=9")]
    [InlineData("/api/budgets/2026/9")]
    [InlineData("/api/finance/summary?year=2026&month=9")]
    [InlineData("/api/auth/me")]
    public async Task PrivateEndpoints_RejectAnonymousRequests(string url)
    {
        using var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync(url)).StatusCode);
    }

    [Fact]
    public async Task DifferentAccount_CannotReadOrDeleteOwnedDataAcrossAggregates()
    {
        await factory.EnsureUserAsync(17, "owner@example.com");
        await factory.EnsureUserAsync(18, "other@example.com");
        int taskId;
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var task = new StudyTask
            {
                UserId = 17, Title = "Private task", Course = "Math",
                DueDate = new DateTime(2026, 9, 12, 12, 0, 0, DateTimeKind.Utc),
                Priority = StudyTaskPriority.High
            };
            db.StudyTasks.Add(task);
            db.Expenses.Add(new Expense
            {
                UserId = 17, Title = "Private expense", Amount = 25,
                Category = "School", Date = new DateTime(2026, 9, 4, 12, 0, 0, DateTimeKind.Utc)
            });
            db.MonthlyBudgets.Add(new MonthlyBudget
            {
                UserId = 17, Year = 2026, Month = 9, Amount = 500
            });
            await db.SaveChangesAsync();
            taskId = task.Id;
        }

        using var otherClient = factory.CreateAuthenticatedClient(18);
        var profile = await otherClient.GetFromJsonAsync<CurrentUserDto>("/api/auth/me");
        otherClient.DefaultRequestHeaders.Add("X-FocusFlow-CSRF", profile!.AntiforgeryToken);

        Assert.Empty((await otherClient.GetFromJsonAsync<List<StudyTaskDto>>("/api/tasks"))!);
        Assert.Empty((await otherClient.GetFromJsonAsync<List<ExpenseDto>>("/api/expenses?year=2026&month=9"))!);
        Assert.Equal(HttpStatusCode.NoContent, (await otherClient.GetAsync("/api/budgets/2026/9")).StatusCode);
        var summary = await otherClient.GetFromJsonAsync<FinanceSummaryDto>("/api/finance/summary?year=2026&month=9");
        Assert.False(summary!.HasBudget);
        Assert.Equal(0, summary.TotalSpent);
        Assert.Equal(HttpStatusCode.NotFound, (await otherClient.DeleteAsync($"/api/tasks/{taskId}")).StatusCode);

        await using var verificationScope = factory.Services.CreateAsyncScope();
        var verificationDb = verificationScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.True(await verificationDb.StudyTasks.AnyAsync(task => task.Id == taskId && task.UserId == 17));
    }

    [Fact]
    public async Task Logout_RequiresCsrfAndReturnsNoContentWithValidToken()
    {
        await factory.EnsureUserAsync(19, "logout@example.com");
        using var client = factory.CreateAuthenticatedClient(19);

        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync("/api/auth/logout", null)).StatusCode);
        var profile = await client.GetFromJsonAsync<CurrentUserDto>("/api/auth/me");
        client.DefaultRequestHeaders.Add("X-FocusFlow-CSRF", profile!.AntiforgeryToken);
        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync("/api/auth/logout", null)).StatusCode);
    }
}
