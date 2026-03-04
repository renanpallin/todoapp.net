using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TodoApi.Data;
using TodoApi.DTOs;
using Xunit;

namespace TodoApi.Tests;

public class CustomWebAppFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<TodoDbContext>));
            if (descriptor != null) services.Remove(descriptor);

            services.AddDbContext<TodoDbContext>(options =>
                options.UseInMemoryDatabase("TestDb"));
        });
    }
}

public class TodosControllerTests : IClassFixture<CustomWebAppFactory>
{
    private readonly CustomWebAppFactory _factory;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public TodosControllerTests(CustomWebAppFactory factory)
    {
        _factory = factory;
    }

    private async Task<HttpClient> CreateAuthenticatedClient(string username = "testuser")
    {
        var client = _factory.CreateClient();
        var password = "testpass123";

        await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Username = username,
            Password = password
        });

        var loginResponse = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Username = username,
            Password = password
        });

        var auth = await loginResponse.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", auth!.Token);

        return client;
    }

    [Fact]
    public async Task GetAll_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/todos");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetAll_ReturnsEmptyList()
    {
        var client = await CreateAuthenticatedClient("emptyuser");
        var response = await client.GetAsync("/api/todos");
        response.EnsureSuccessStatusCode();
        var todos = await response.Content.ReadFromJsonAsync<List<TodoResponse>>(JsonOptions);
        Assert.NotNull(todos);
        Assert.Empty(todos);
    }

    [Fact]
    public async Task Create_ReturnsCreatedTodo()
    {
        var client = await CreateAuthenticatedClient("createuser");
        var response = await client.PostAsJsonAsync("/api/todos",
            new CreateTodoRequest { Title = "Test todo" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<TodoResponse>(JsonOptions);
        Assert.NotNull(created);
        Assert.Equal("Test todo", created.Title);
        Assert.False(created.IsCompleted);
    }

    [Fact]
    public async Task GetById_ReturnsNotFound_WhenMissing()
    {
        var client = await CreateAuthenticatedClient("getbyiduser");
        var response = await client.GetAsync("/api/todos/999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Update_ChangesTitle()
    {
        var client = await CreateAuthenticatedClient("updateuser");
        var create = await client.PostAsJsonAsync("/api/todos",
            new CreateTodoRequest { Title = "Original" });
        var created = await create.Content.ReadFromJsonAsync<TodoResponse>(JsonOptions);

        var response = await client.PutAsJsonAsync($"/api/todos/{created!.Id}",
            new UpdateTodoRequest { Title = "Updated", IsCompleted = true });

        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<TodoResponse>(JsonOptions);
        Assert.Equal("Updated", result!.Title);
        Assert.True(result.IsCompleted);
    }

    [Fact]
    public async Task Delete_ReturnsNoContent()
    {
        var client = await CreateAuthenticatedClient("deleteuser");
        var create = await client.PostAsJsonAsync("/api/todos",
            new CreateTodoRequest { Title = "To delete" });
        var created = await create.Content.ReadFromJsonAsync<TodoResponse>(JsonOptions);

        var response = await client.DeleteAsync($"/api/todos/{created!.Id}");
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var get = await client.GetAsync($"/api/todos/{created.Id}");
        Assert.Equal(HttpStatusCode.NotFound, get.StatusCode);
    }

    [Fact]
    public async Task Create_ReturnsBadRequest_WhenTitleEmpty()
    {
        var client = await CreateAuthenticatedClient("badrequser");
        var response = await client.PostAsJsonAsync("/api/todos",
            new CreateTodoRequest { Title = "" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UserCannotSeeOtherUsersTodos()
    {
        var client1 = await CreateAuthenticatedClient("isolateuser1");
        await client1.PostAsJsonAsync("/api/todos",
            new CreateTodoRequest { Title = "User1 todo" });

        var client2 = await CreateAuthenticatedClient("isolateuser2");
        var response = await client2.GetAsync("/api/todos");
        var todos = await response.Content.ReadFromJsonAsync<List<TodoResponse>>(JsonOptions);

        Assert.NotNull(todos);
        Assert.Empty(todos);
    }

    [Fact]
    public async Task GetAll_ReturnsXTotalCountHeader()
    {
        var client = await CreateAuthenticatedClient("countuser");
        await client.PostAsJsonAsync("/api/todos",
            new CreateTodoRequest { Title = "Todo 1" });
        await client.PostAsJsonAsync("/api/todos",
            new CreateTodoRequest { Title = "Todo 2" });

        var response = await client.GetAsync("/api/todos");
        response.EnsureSuccessStatusCode();

        Assert.True(response.Headers.Contains("X-Total-Count"));
        Assert.Equal("2", response.Headers.GetValues("X-Total-Count").First());
    }

    [Fact]
    public async Task Create_WithTags_ReturnsTodoWithTags()
    {
        var client = await CreateAuthenticatedClient("tagcreateuser");
        var response = await client.PostAsJsonAsync("/api/todos",
            new CreateTodoRequest { Title = "Tagged todo", Tags = new List<string> { "urgent", "personal" } });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<TodoResponse>(JsonOptions);
        Assert.NotNull(created);
        Assert.Equal(2, created.Tags.Count);
        Assert.Contains("urgent", created.Tags);
        Assert.Contains("personal", created.Tags);
    }

    [Fact]
    public async Task Update_CanChangeTags()
    {
        var client = await CreateAuthenticatedClient("tagupdateuser");
        var create = await client.PostAsJsonAsync("/api/todos",
            new CreateTodoRequest { Title = "Todo", Tags = new List<string> { "old" } });
        var created = await create.Content.ReadFromJsonAsync<TodoResponse>(JsonOptions);

        var response = await client.PutAsJsonAsync($"/api/todos/{created!.Id}",
            new UpdateTodoRequest { Title = "Todo", IsCompleted = false, Tags = new List<string> { "new", "updated" } });

        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<TodoResponse>(JsonOptions);
        Assert.Equal(2, result!.Tags.Count);
        Assert.Contains("new", result.Tags);
        Assert.Contains("updated", result.Tags);
        Assert.DoesNotContain("old", result.Tags);
    }

    [Fact]
    public async Task Update_WithEmptyTags_RemovesAllTags()
    {
        var client = await CreateAuthenticatedClient("tagemptyuser");
        var create = await client.PostAsJsonAsync("/api/todos",
            new CreateTodoRequest { Title = "Todo", Tags = new List<string> { "tag1" } });
        var created = await create.Content.ReadFromJsonAsync<TodoResponse>(JsonOptions);

        var response = await client.PutAsJsonAsync($"/api/todos/{created!.Id}",
            new UpdateTodoRequest { Title = "Todo", IsCompleted = false, Tags = new List<string>() });

        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<TodoResponse>(JsonOptions);
        Assert.Empty(result!.Tags);
    }

    [Fact]
    public async Task Tags_NormalizesTrimAndLowercase()
    {
        var client = await CreateAuthenticatedClient("tagnormuser");
        var response = await client.PostAsJsonAsync("/api/todos",
            new CreateTodoRequest { Title = "Todo", Tags = new List<string> { "  URGENT  ", "urgent" } });

        var created = await response.Content.ReadFromJsonAsync<TodoResponse>(JsonOptions);
        Assert.Single(created!.Tags);
        Assert.Contains("urgent", created.Tags);
    }

    [Fact]
    public async Task Tags_ReusesExistingTagsAcrossTodos()
    {
        var client = await CreateAuthenticatedClient("tagreuseuser");
        await client.PostAsJsonAsync("/api/todos",
            new CreateTodoRequest { Title = "Todo 1", Tags = new List<string> { "shared" } });
        await client.PostAsJsonAsync("/api/todos",
            new CreateTodoRequest { Title = "Todo 2", Tags = new List<string> { "shared" } });

        var tagsResponse = await client.GetAsync("/api/tags");
        tagsResponse.EnsureSuccessStatusCode();
        var tags = await tagsResponse.Content.ReadFromJsonAsync<List<string>>(JsonOptions);
        Assert.Single(tags!);
        Assert.Equal("shared", tags[0]);
    }

    [Fact]
    public async Task TagsEndpoint_ReturnsUserTagsSorted()
    {
        var client = await CreateAuthenticatedClient("tagsortuser");
        await client.PostAsJsonAsync("/api/todos",
            new CreateTodoRequest { Title = "Todo", Tags = new List<string> { "zebra", "alpha", "middle" } });

        var response = await client.GetAsync("/api/tags");
        response.EnsureSuccessStatusCode();
        var tags = await response.Content.ReadFromJsonAsync<List<string>>(JsonOptions);
        Assert.Equal(new List<string> { "alpha", "middle", "zebra" }, tags);
    }

    [Fact]
    public async Task TagsEndpoint_IsolatedPerUser()
    {
        var client1 = await CreateAuthenticatedClient("tagisouser1");
        await client1.PostAsJsonAsync("/api/todos",
            new CreateTodoRequest { Title = "Todo", Tags = new List<string> { "private-tag" } });

        var client2 = await CreateAuthenticatedClient("tagisouser2");
        var response = await client2.GetAsync("/api/tags");
        var tags = await response.Content.ReadFromJsonAsync<List<string>>(JsonOptions);
        Assert.Empty(tags!);
    }
}
