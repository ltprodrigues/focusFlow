using backend.Data;
using backend.DTOs;
using backend.Mappings;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/tasks")]
public sealed class TasksController(
    ApplicationDbContext db,
    ICurrentUserService currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<StudyTaskDto>>> GetTasks(DateTime? from, DateTime? to)
    {
        if (from.HasValue && to.HasValue && to.Value < from.Value)
            return ValidationProblem(
                detail: "'to' must be on or after 'from'.",
                statusCode: StatusCodes.Status400BadRequest);

        var query = db.StudyTasks
            .AsNoTracking()
            .Where(task => task.UserId == currentUser.UserId);

        if (from.HasValue)
            query = query.Where(task => task.DueDate >= from.Value);

        if (to.HasValue)
            query = query.Where(task => task.DueDate <= to.Value);

        var tasks = await query
            .OrderBy(task => task.DueDate)
            .Select(task => task.ToDto())
            .ToListAsync();

        return tasks;
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<StudyTaskDto>> GetTask(int id)
    {
        var task = await db.StudyTasks
            .AsNoTracking()
            .Where(task => task.Id == id && task.UserId == currentUser.UserId)
            .Select(task => task.ToDto())
            .SingleOrDefaultAsync();

        return task is null ? NotFound() : task;
    }

    [HttpPost]
    public async Task<ActionResult<StudyTaskDto>> CreateTask(UpsertStudyTaskDto request)
    {
        var task = new StudyTask
        {
            Title = request.Title,
            Course = request.Course,
            Notes = request.Notes,
            DueDate = request.DueDate,
            Priority = request.Priority,
            IsCompleted = request.IsCompleted,
            UserId = currentUser.UserId
        };

        db.StudyTasks.Add(task);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTask), new { id = task.Id }, task.ToDto());
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateTask(int id, UpsertStudyTaskDto request)
    {
        var task = await db.StudyTasks
            .SingleOrDefaultAsync(task => task.Id == id && task.UserId == currentUser.UserId);

        if (task is null)
            return NotFound();

        task.Title = request.Title;
        task.Course = request.Course;
        task.Notes = request.Notes;
        task.DueDate = request.DueDate;
        task.Priority = request.Priority;
        task.IsCompleted = request.IsCompleted;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteTask(int id)
    {
        var task = await db.StudyTasks
            .SingleOrDefaultAsync(task => task.Id == id && task.UserId == currentUser.UserId);

        if (task is null)
            return NotFound();

        db.StudyTasks.Remove(task);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
