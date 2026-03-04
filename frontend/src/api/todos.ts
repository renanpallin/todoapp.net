import { Todo, CreateTodoInput } from "../types/todo";
import { parseApiError } from "./errors";

const BASE_URL = "/api/todos";

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = localStorage.getItem("token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: getHeaders(),
    ...options,
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
}

export const todosApi = {
  getAll: async (
    page: number = 1,
    pageSize: number = 10
  ): Promise<PaginatedResult<Todo>> => {
    const response = await fetch(
      `${BASE_URL}?page=${page}&pageSize=${pageSize}`,
      { headers: getHeaders() }
    );

    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      window.location.href = "/login";
      throw new Error("Unauthorized");
    }

    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    const totalCount = parseInt(
      response.headers.get("X-Total-Count") || "0",
      10
    );
    const data: Todo[] = await response.json();
    return { data, totalCount };
  },

  getById: (id: number) => request<Todo>(`${BASE_URL}/${id}`),

  create: (input: CreateTodoInput) =>
    request<Todo>(BASE_URL, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  update: (id: number, todo: Partial<Todo>) =>
    request<Todo>(`${BASE_URL}/${id}`, {
      method: "PUT",
      body: JSON.stringify(todo),
    }),

  delete: (id: number) =>
    request<void>(`${BASE_URL}/${id}`, { method: "DELETE" }),
};
