using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TodoApi.Data;

namespace TodoApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TagsController : ControllerBase
{
    private readonly TodoDbContext _db;

    public TagsController(TodoDbContext db)
    {
        _db = db;
    }

    private int UserId => int.Parse(
        User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<List<string>>> GetAll()
    {
        var tags = await _db.Tags
            .Where(t => t.UserId == UserId)
            .OrderBy(t => t.Name)
            .Select(t => t.Name)
            .ToListAsync();

        return tags;
    }
}
