export interface Todo {
  id: number;
  title: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string | null;
  tags: string[];
}

export interface CreateTodoInput {
  title: string;
  tags?: string[];
}
