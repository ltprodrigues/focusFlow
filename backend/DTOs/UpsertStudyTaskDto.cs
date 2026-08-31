using System.ComponentModel.DataAnnotations;
using backend.Models;

namespace backend.DTOs;

public sealed class UpsertStudyTaskDto
{
    [Required, StringLength(160)]
    public string Title { get; init; } = string.Empty;

    [Required, StringLength(100)]
    public string Course { get; init; } = string.Empty;

    [StringLength(2000)]
    public string? Notes { get; init; }

    public DateTime DueDate { get; init; }

    [EnumDataType(typeof(StudyTaskPriority))]
    public StudyTaskPriority Priority { get; init; }

    public bool IsCompleted { get; init; }
}
