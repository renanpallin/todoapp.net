using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TodoApi.Data;
using TodoApi.DTOs;
using TodoApi.Models;

namespace TodoApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TodosController : ControllerBase
{
    private readonly TodoDbContext _db;

    public TodosController(TodoDbContext db)
    {
        _db = db;
    }

    private int UserId => int.Parse(
        User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<List<TodoResponse>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 1;
        if (pageSize > 100) pageSize = 100;

        var query = _db.TodoItems
            .Where(t => t.UserId == UserId)
            .OrderByDescending(t => t.CreatedAt);

        var totalCount = await query.CountAsync();
        Response.Headers["X-Total-Count"] = totalCount.ToString();

        var todos = await query
            .Include(t => t.Tags)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return todos.Select(ToResponse).ToList();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TodoResponse>> GetById(int id)
    {
        var todo = await _db.TodoItems
            .Include(t => t.Tags)
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == UserId);
        if (todo is null) return NotFound();
        return ToResponse(todo);
    }

    [HttpPost]
    public async Task<ActionResult<TodoResponse>> Create(CreateTodoRequest request)
    {
        var todo = new TodoItem
        {
            Title = request.Title,
            IsCompleted = false,
            CreatedAt = DateTime.UtcNow,
            UserId = UserId
        };

        if (request.Tags is { Count: > 0 })
        {
            todo.Tags = await ResolveTagsAsync(request.Tags);
        }

        _db.TodoItems.Add(todo);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = todo.Id }, ToResponse(todo));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<TodoResponse>> Update(int id, UpdateTodoRequest request)
    {
        var todo = await _db.TodoItems
            .Include(t => t.Tags)
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == UserId);
        if (todo is null) return NotFound();

        todo.Title = request.Title;
        todo.IsCompleted = request.IsCompleted;
        todo.UpdatedAt = DateTime.UtcNow;

        if (request.Tags is not null)
        {
            todo.Tags.Clear();
            if (request.Tags.Count > 0)
            {
                todo.Tags = await ResolveTagsAsync(request.Tags);
            }
        }

        await _db.SaveChangesAsync();
        return ToResponse(todo);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var todo = await _db.TodoItems
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == UserId);
        if (todo is null) return NotFound();

        _db.TodoItems.Remove(todo);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<List<Tag>> ResolveTagsAsync(List<string> tagNames)
    {
        var normalized = tagNames
            .Select(t => t.Trim().ToLowerInvariant())
            .Where(t => t.Length > 0)
            .Distinct()
            .ToList();

        var existing = await _db.Tags
            .Where(t => t.UserId == UserId && normalized.Contains(t.Name))
            .ToListAsync();

        var existingNames = existing.Select(t => t.Name).ToHashSet();
        var newTags = normalized
            .Where(n => !existingNames.Contains(n))
            .Select(n => new Tag { Name = n, UserId = UserId })
            .ToList();

        if (newTags.Count > 0)
        {
            _db.Tags.AddRange(newTags);
        }

        return existing.Concat(newTags).ToList();
    }

    private static TodoResponse ToResponse(TodoItem todo) => new()
    {
        Id = todo.Id,
        Title = todo.Title,
        IsCompleted = todo.IsCompleted,
        CreatedAt = todo.CreatedAt,
        UpdatedAt = todo.UpdatedAt,
        Tags = todo.Tags.Select(t => t.Name).OrderBy(n => n).ToList()
    };
}
