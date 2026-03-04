# Todo App — Full Stack (.NET 8 + React)

**Author:** Renan Pallin

A full-stack Todo application with JWT authentication, tags, dark mode, built with .NET 8 Web API, React 18, TypeScript, and Docker.

## Quick Start

```bash
docker compose up --build
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5001/api/todos
- **Swagger:** http://localhost:5001/swagger
- **Health Check:** http://localhost:5001/health

## Running Tests

```bash
# Backend integration tests (xUnit)
docker compose exec backend dotnet test TodoApi.Tests/TodoApi.Tests.csproj

# Frontend unit tests (Vitest)
docker compose exec frontend npm test
```

## Features

- **Authentication** — Register/login with JWT tokens, per-user data isolation
- **Task lifecycle** — Create, list, view, update, and delete tasks
- **Tags** — Many-to-many tags on tasks, created inline (trim, lowercase, deduplicated). Autocomplete suggests existing tags. Tags are scoped per user.
- **Dark mode** — Toggle in the header, persisted to localStorage, dark by default
- Inline title editing (double-click)
- Inline tag editing (click on tags column)
- Pagination with `X-Total-Count` header
- Delete confirmation
- Health check endpoint (`/health`)
- Global error handling (no stack trace leakage)
- Loading skeletons and error states

## Architecture

```
todo.net/
├── backend/          .NET 8 Web API + EF Core + SQLite
│   ├── TodoApi/
│   │   ├── Controllers/   AuthController, TodosController, TagsController
│   │   ├── Data/          EF Core DbContext (many-to-many via TodoItemTag)
│   │   ├── DTOs/          Request/Response DTOs
│   │   ├── Middleware/    Global exception handling
│   │   ├── Models/        User, TodoItem, Tag entities
│   │   └── Services/      AuthService (JWT + BCrypt)
│   └── TodoApi.Tests/     Integration tests (xUnit + InMemory DB)
├── frontend/         React 18 + TypeScript + Vite
│   └── src/
│       ├── api/           API clients (todos, auth, tags)
│       ├── components/    TodoForm, TodoTable, TagInput, ui/
│       ├── context/       AuthContext (JWT in localStorage)
│       ├── pages/         Login, Register
│       ├── types/         TypeScript interfaces
│       └── __tests__/     Unit tests (Vitest + Testing Library)
└── docker-compose.yml
```

### API Endpoints

| Method | Route              | Auth | Description                        |
|--------|--------------------|------|------------------------------------|
| POST   | /api/auth/register | No   | Register new user                  |
| POST   | /api/auth/login    | No   | Login, returns JWT                 |
| GET    | /api/todos         | Yes  | List user's tasks (paginated)      |
| GET    | /api/todos/{id}    | Yes  | Get task by ID                     |
| POST   | /api/todos         | Yes  | Create task (with optional tags)   |
| PUT    | /api/todos/{id}    | Yes  | Update task (title, status, tags)  |
| DELETE | /api/todos/{id}    | Yes  | Delete task                        |
| GET    | /api/tags          | Yes  | List user's tags (for autocomplete)|
| GET    | /health            | No   | Health check                       |

**Pagination:** `GET /api/todos?page=1&pageSize=20` — returns `X-Total-Count` header.

**Tags on create/update:** Send `"tags": ["work", "urgent"]` in the request body. On update, `null` preserves existing tags, `[]` removes all.

## Design Decisions & Trade-offs

- **JWT + BCrypt** — Industry-standard auth. BCrypt for password hashing (secure, no config). JWT stored in localStorage (acceptable for a take-home; production would use httpOnly cookies).
- **DTOs** — Clear separation between API contract and database models. Prevents leaking internal fields (like UserId, PasswordHash).
- **SQLite** — Simple, zero-config, file-based. Easy to swap for PostgreSQL via EF Core.
- **Flat architecture** — No DDD layers (repositories, services). Intentionally kept simple — the controller handles queries directly. This is appropriate for the scope; a larger app would benefit from a service layer.
- **Tags as inline strings** — No separate tag management UI. Tags are created on-the-fly when added to a todo, normalized (trim + lowercase), and deduplicated. The many-to-many relationship uses EF Core's `UsingEntity("TodoItemTag")` convention.
- **Fetch over Axios** — No need for an extra dependency for simple REST calls.
- **InMemory DB for tests** — Fast, isolated, no cleanup needed. Each test class gets a unique database.
- **Pagination via headers** — `X-Total-Count` header doesn't change the response shape (stays as an array).
- **Dark mode via CSS custom properties** — Uses the `.dark` class on `<html>`, toggling shadcn/ui-style CSS variables. Persisted to localStorage.

## Assumptions

- Single user per browser session (JWT in localStorage).
- Tags are short labels (max 50 chars), case-insensitive, scoped per user.
- No real-time sync — optimistic UI updates with cache invalidation on mutations.

## Future Improvements

- **Due dates & priorities** — Add deadline and priority fields to tasks, with sorting and filtering.
- **Tag filtering** — Filter the task list by one or more tags.
- **httpOnly cookies** — Move JWT from localStorage to secure httpOnly cookies to prevent XSS token theft.
- **Rate limiting** — Protect auth endpoints from brute-force attacks.
- **Refresh tokens** — Avoid forcing re-login when the access token expires.
- **Database migrations** — Replace `EnsureCreated()` with EF Core migrations for safe schema evolution.
- **Logging & observability** — Structured logging (Serilog), request tracing, metrics endpoint.
- **CI/CD pipeline** — GitHub Actions for build, test, and deploy.
- **Accessibility** — Full ARIA support, keyboard navigation audit, screen reader testing.
