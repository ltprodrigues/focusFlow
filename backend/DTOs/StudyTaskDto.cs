using backend.Models;

namespace backend.DTOs;

public sealed record StudyTaskDto(
    int Id,
    string Title,
    string Course,
    string? Notes,
    DateTime DueDate,
    StudyTaskPriority Priority,
    bool IsCompleted);
