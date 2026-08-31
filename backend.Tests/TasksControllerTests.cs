using backend.Controllers;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

public class TasksControllerTests
{
    [Fact]
    public async Task GetTasks_ReturnsOnlyOwnedTasksInRange()
    {
        await using var db = TestDbContextFactory.Create();
        var dueDate = new DateTime(2026, 8, 24, 12, 0, 0, DateTimeKind.Utc);
        db.StudyTasks.AddRange(
            NewTask(1, dueDate),
            NewTask(2, dueDate),
            NewTask(1, new DateTime(2026, 9, 2, 12, 0, 0, DateTimeKind.Utc)));
        await db.SaveChangesAsync();
        var controller = new TasksController(db, new FakeCurrentUserService(1));

        var result = await controller.GetTasks(
            new DateTime(2026, 8, 24, 0, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 28, 23, 59, 59, DateTimeKind.Utc));

        var task = Assert.Single(result.Value!);
        Assert.Equal(dueDate, task.DueDate);
    }

    [Fact]
    public async Task GetTasks_WithoutDates_ReturnsEveryOwnedTask()
    {
        await using var db = TestDbContextFactory.Create();
        db.StudyTasks.AddRange(
            NewTask(1, new DateTime(2026, 9, 2, 12, 0, 0, DateTimeKind.Utc)),
            NewTask(1, new DateTime(2026, 8, 24, 12, 0, 0, DateTimeKind.Utc)),
            NewTask(2, new DateTime(2026, 8, 25, 12, 0, 0, DateTimeKind.Utc)));
        await db.SaveChangesAsync();
        var controller = new TasksController(db, new FakeCurrentUserService(1));

        var result = await controller.GetTasks(null, null);

        Assert.Collection(
            result.Value!,
            task => Assert.Equal(new DateTime(2026, 8, 24, 12, 0, 0, DateTimeKind.Utc), task.DueDate),
            task => Assert.Equal(new DateTime(2026, 9, 2, 12, 0, 0, DateTimeKind.Utc), task.DueDate));
    }

    [Fact]
    public async Task GetTasks_WithInvertedDateRange_ReturnsBadRequest()
    {
        await using var db = TestDbContextFactory.Create();
        var controller = new TasksController(db, new FakeCurrentUserService(1));

        var result = await controller.GetTasks(
            new DateTime(2026, 8, 29, 0, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 28, 0, 0, 0, DateTimeKind.Utc));

        var response = Assert.IsAssignableFrom<ObjectResult>(result.Result);
        var problem = Assert.IsType<ValidationProblemDetails>(response.Value);
        Assert.Equal(400, problem.Status);
    }

    [Fact]
    public async Task GetTask_ReturnsNotFoundForAnotherUsersTask()
    {
        await using var db = TestDbContextFactory.Create();
        var task = NewTask(2, DateTime.UtcNow);
        db.StudyTasks.Add(task);
        await db.SaveChangesAsync();
        var controller = new TasksController(db, new FakeCurrentUserService(1));

        var result = await controller.GetTask(task.Id);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task CreateTask_PersistsTaskForCurrentUser()
    {
        await using var db = TestDbContextFactory.Create();
        var controller = new TasksController(db, new FakeCurrentUserService(1));
        var request = new UpsertStudyTaskDto
        {
            Title = "Research paper",
            Course = "History",
            Notes = "Use primary sources",
            DueDate = new DateTime(2026, 9, 5, 14, 0, 0, DateTimeKind.Utc),
            Priority = StudyTaskPriority.High,
            IsCompleted = false
        };

        var result = await controller.CreateTask(request);

        var response = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal(201, response.StatusCode);
        var created = Assert.IsType<StudyTaskDto>(response.Value);
        var persisted = await db.StudyTasks.SingleAsync();
        Assert.Equal(1, persisted.UserId);
        Assert.Equal(created.Id, persisted.Id);
        Assert.Equal("History", persisted.Course);
    }

    [Fact]
    public async Task UpdateTask_MapsRequestAndCompletionState()
    {
        await using var db = TestDbContextFactory.Create();
        var task = NewTask(1, new DateTime(2026, 8, 24, 12, 0, 0, DateTimeKind.Utc));
        db.StudyTasks.Add(task);
        await db.SaveChangesAsync();
        var controller = new TasksController(db, new FakeCurrentUserService(1));
        var request = new UpsertStudyTaskDto
        {
            Title = "Revised essay",
            Course = "Literature",
            Notes = "Submit online",
            DueDate = new DateTime(2026, 8, 30, 9, 30, 0, DateTimeKind.Utc),
            Priority = StudyTaskPriority.Medium,
            IsCompleted = true
        };

        var result = await controller.UpdateTask(task.Id, request);

        Assert.IsType<NoContentResult>(result);
        var persisted = await db.StudyTasks.SingleAsync();
        Assert.Equal("Revised essay", persisted.Title);
        Assert.Equal("Literature", persisted.Course);
        Assert.Equal("Submit online", persisted.Notes);
        Assert.Equal(new DateTime(2026, 8, 30, 9, 30, 0, DateTimeKind.Utc), persisted.DueDate);
        Assert.Equal(StudyTaskPriority.Medium, persisted.Priority);
        Assert.True(persisted.IsCompleted);
        Assert.Equal(1, persisted.UserId);
    }

    [Fact]
    public async Task UpdateTask_ReturnsNotFoundForAnotherUsersTask()
    {
        await using var db = TestDbContextFactory.Create();
        var task = NewTask(2, DateTime.UtcNow);
        db.StudyTasks.Add(task);
        await db.SaveChangesAsync();
        var controller = new TasksController(db, new FakeCurrentUserService(1));

        var result = await controller.UpdateTask(task.Id, NewRequest());

        Assert.IsType<NotFoundResult>(result);
        Assert.Equal(2, (await db.StudyTasks.SingleAsync()).UserId);
    }

    [Fact]
    public async Task DeleteTask_ReturnsNotFoundForAnotherUsersTask()
    {
        await using var db = TestDbContextFactory.Create();
        var task = NewTask(2, DateTime.UtcNow);
        db.StudyTasks.Add(task);
        await db.SaveChangesAsync();
        var controller = new TasksController(db, new FakeCurrentUserService(1));

        var result = await controller.DeleteTask(task.Id);

        Assert.IsType<NotFoundResult>(result);
        Assert.Equal(2, (await db.StudyTasks.SingleAsync()).UserId);
    }

    [Fact]
    public async Task DeleteTask_RemovesOwnedTask()
    {
        await using var db = TestDbContextFactory.Create();
        var task = NewTask(1, DateTime.UtcNow);
        db.StudyTasks.Add(task);
        await db.SaveChangesAsync();
        var controller = new TasksController(db, new FakeCurrentUserService(1));

        var result = await controller.DeleteTask(task.Id);

        Assert.IsType<NoContentResult>(result);
        Assert.Empty(await db.StudyTasks.ToListAsync());
    }

    private static StudyTask NewTask(int userId, DateTime dueDate) => new()
    {
        Title = "Original task",
        Course = "Math",
        Notes = "Original notes",
        DueDate = dueDate,
        Priority = StudyTaskPriority.Low,
        UserId = userId
    };

    private static UpsertStudyTaskDto NewRequest() => new()
    {
        Title = "New task",
        Course = "Science",
        DueDate = new DateTime(2026, 9, 1, 12, 0, 0, DateTimeKind.Utc),
        Priority = StudyTaskPriority.Low
    };
}
