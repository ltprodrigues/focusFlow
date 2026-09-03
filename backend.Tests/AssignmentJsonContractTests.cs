using System.Text.Json;
using backend.DTOs;
using backend.Models;
using backend.Serialization;

public class AssignmentJsonContractTests
{
    [Fact]
    public void Configure_BindsAndEmitsNamedPriorities()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        AssignmentJsonOptions.Configure(options);

        var request = JsonSerializer.Deserialize<UpsertStudyTaskDto>(
            """{"title":"Essay","course":"English","dueDate":"2026-09-03T16:00:00Z","priority":"High","isCompleted":false}""",
            options);
        var response = JsonSerializer.Serialize(
            new StudyTaskDto(4, "Essay", "English", null, DateTime.Parse("2026-09-03T16:00:00Z"), StudyTaskPriority.High, false),
            options);

        Assert.NotNull(request);
        Assert.Equal(StudyTaskPriority.High, request.Priority);
        Assert.Contains("\"priority\":\"High\"", response);
    }
}
