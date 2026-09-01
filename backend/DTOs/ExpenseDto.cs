namespace backend.DTOs;

public sealed record ExpenseDto(
    int Id,
    string Title,
    decimal Amount,
    string Category,
    DateTime Date,
    string? Notes);
