using backend.DTOs;
using backend.Models;

namespace backend.Mappings;

public static class StudyTaskMappings
{
    public static StudyTaskDto ToDto(this StudyTask task) => new(
        task.Id,
        task.Title,
        task.Course,
        task.Notes,
        task.DueDate,
        task.Priority,
        task.IsCompleted);
}
