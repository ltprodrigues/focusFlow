using backend.DTOs;
using backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/finance")]
public sealed class FinanceController(
    IFinanceSummaryService financeSummary,
    ICurrentUserService currentUser) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<ActionResult<FinanceSummaryDto>> GetSummary(
        int year,
        int month,
        CancellationToken cancellationToken)
    {
        if (year is < 1 or > 9998 || month is < 1 or > 12)
            return ValidationProblem(
                detail: "Year must be between 1 and 9998 and month must be between 1 and 12.",
                statusCode: StatusCodes.Status400BadRequest);

        return await financeSummary.GetAsync(
            currentUser.UserId,
            year,
            month,
            cancellationToken);
    }
}
