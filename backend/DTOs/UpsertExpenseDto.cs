using System.ComponentModel.DataAnnotations;

namespace backend.DTOs;

public sealed class UpsertExpenseDto
{
    [Required, StringLength(160), RegularExpression(@"[\s\S]*\S[\s\S]*", ErrorMessage = "Title cannot be blank.")]
    public string? Title { get; init; }

    [Range(typeof(decimal), "0.01", "79228162514264337593543950335")]
    public decimal Amount { get; init; }

    [Required, StringLength(80), RegularExpression(@"[\s\S]*\S[\s\S]*", ErrorMessage = "Category cannot be blank.")]
    public string? Category { get; init; }

    [Required]
    public DateTime? Date { get; init; }

    [StringLength(2000)]
    public string? Notes { get; init; }
}
