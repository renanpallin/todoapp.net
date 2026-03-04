using System.ComponentModel.DataAnnotations;

namespace TodoApi.DTOs;

public class CreateTodoRequest
{
    [Required(ErrorMessage = "Title is required.")]
    [MaxLength(200, ErrorMessage = "Title must be at most 200 characters.")]
    public string Title { get; set; } = string.Empty;

    public List<string>? Tags { get; set; }
}
