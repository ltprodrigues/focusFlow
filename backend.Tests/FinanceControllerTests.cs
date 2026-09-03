using backend.Controllers;
using backend.DTOs;
using backend.Services;
using Microsoft.AspNetCore.Mvc;

public class FinanceControllerTests
{
    [Fact]
    public async Task GetSummary_CallsServiceWithActiveUserAndPeriod()
    {
        var service = new RecordingFinanceSummaryService();
        var controller = new FinanceController(service, new FakeCurrentUserService(42));
        using var source = new CancellationTokenSource();

        var result = await controller.GetSummary(2026, 8, source.Token);

        Assert.NotNull(result.Value);
        Assert.Equal((42, 2026, 8, source.Token), service.Arguments);
    }

    [Theory]
    [InlineData(2026, 0)]
    [InlineData(2026, 13)]
    [InlineData(0, 8)]
    [InlineData(9999, 8)]
    public async Task GetSummary_RejectsInvalidYearOrMonthWithoutCallingService(int year, int month)
    {
        var service = new RecordingFinanceSummaryService();
        var controller = new FinanceController(service, new FakeCurrentUserService(1));

        var result = await controller.GetSummary(year, month, CancellationToken.None);

        Assert.IsAssignableFrom<ObjectResult>(result.Result);
        Assert.Null(service.Arguments);
    }

    private sealed class RecordingFinanceSummaryService : IFinanceSummaryService
    {
        public (int UserId, int Year, int Month, CancellationToken Token)? Arguments { get; private set; }

        public Task<FinanceSummaryDto> GetAsync(int userId, int year, int month, CancellationToken cancellationToken)
        {
            Arguments = (userId, year, month, cancellationToken);
            return Task.FromResult(new FinanceSummaryDto(year, month, 0m, 0m, 0m, false, false, []));
        }
    }
}
