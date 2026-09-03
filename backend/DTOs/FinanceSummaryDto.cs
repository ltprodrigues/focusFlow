namespace backend.DTOs;

public sealed record FinanceSummaryDto(
    int Year,
    int Month,
    decimal BudgetAmount,
    decimal TotalSpent,
    decimal Remaining,
    bool IsOverBudget,
    bool HasBudget,
    IReadOnlyList<CategoryTotalDto> Categories);
