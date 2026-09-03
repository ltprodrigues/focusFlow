using System.ComponentModel.DataAnnotations;
using backend.Models;

namespace backend.DTOs;

public sealed class UpsertStudyTaskDto
{
    [Required, StringLength(160), RegularExpression(@".*\S.*", ErrorMessage = "Title cannot be blank.")]
    public string? Title { get; init; }

    [Required, StringLength(100), RegularExpression(@".*\S.*", ErrorMessage = "Course cannot be blank.")]
    public string? Course { get; init; }

    [StringLength(2000)]
    public string? Notes { get; init; }

    [Required]
    public DateTime? DueDate { get; init; }

    [Required, EnumDataType(typeof(StudyTaskPriority))]
    public StudyTaskPriority? Priority { get; init; }

    public bool IsCompleted { get; init; }
}
