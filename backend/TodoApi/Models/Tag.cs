using System.ComponentModel.DataAnnotations;

namespace TodoApi.Models;

public class Tag
{
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public List<TodoItem> TodoItems { get; set; } = new();
}
