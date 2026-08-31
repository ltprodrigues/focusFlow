using backend.Mappings;
using backend.Models;

public class StudyTaskMappingsTests
{
    [Fact]
    public void ToDto_CopiesAssignmentFields()
    {
        var task = new StudyTask
        {
            Id = 9,
            Title = "Essay",
            Course = "English",
            Notes = "Cite sources",
            DueDate = new DateTime(2026, 8, 24, 16, 0, 0, DateTimeKind.Utc),
            Priority = StudyTaskPriority.High,
            IsCompleted = false,
            UserId = 1
        };

        var dto = task.ToDto();

        Assert.Equal("English", dto.Course);
        Assert.Equal(StudyTaskPriority.High, dto.Priority);
        Assert.Equal("Cite sources", dto.Notes);
    }

    [Fact]
    public void Priority_UsesLowAsItsDatabaseDefault()
    {
        using var context = TestDbContextFactory.Create();

        var priority = context.Model
            .FindEntityType(typeof(StudyTask))!
            .FindProperty(nameof(StudyTask.Priority))!;

        Assert.Equal(
            StudyTaskPriority.Low,
            priority.FindAnnotation("Relational:DefaultValue")?.Value);
    }
}
