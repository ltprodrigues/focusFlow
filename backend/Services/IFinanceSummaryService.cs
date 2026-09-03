using backend.DTOs;

namespace backend.Services;

public interface IFinanceSummaryService
{
    Task<FinanceSummaryDto> GetAsync(
        int userId,
        int year,
        int month,
        CancellationToken cancellationToken);
}
