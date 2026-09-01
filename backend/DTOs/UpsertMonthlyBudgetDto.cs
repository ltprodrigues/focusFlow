using System.ComponentModel.DataAnnotations;

namespace backend.DTOs;

public sealed class UpsertMonthlyBudgetDto
{
    [Range(typeof(decimal), "0.01", "79228162514264337593543950335")]
    public decimal Amount { get; init; }
}
