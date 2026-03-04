import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Todo } from "../types/todo";
import { todosApi } from "../api/todos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import TagInput from "./TagInput";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 10;

interface Props {
  onError: (msg: string) => void;
  refreshKey: number;
  tagSuggestions?: string[];
}

export default function TodoTable({ onError, refreshKey, tagSuggestions = [] }: Props) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editingTagsId, setEditingTagsId] = useState<number | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const cacheRef = useRef<Map<number, { data: Todo[]; totalCount: number }>>(
    new Map()
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const invalidateCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  const fetchPage = useCallback(
    async (p: number) => {
      const cached = cacheRef.current.get(p);
      if (cached) {
        setTodos(cached.data);
        setTotalCount(cached.totalCount);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const result = await todosApi.getAll(p, PAGE_SIZE);
        cacheRef.current.set(p, result);
        setTodos(result.data);
        setTotalCount(result.totalCount);
      } catch {
        onError("Failed to load todos");
      } finally {
        setLoading(false);
      }
    },
    [onError]
  );

  useEffect(() => {
    invalidateCache();
    setPage(1);
    fetchPage(1);
  }, [refreshKey, invalidateCache, fetchPage]);

  useEffect(() => {
    fetchPage(page);
  }, [page, fetchPage]);

  useEffect(() => {
    if (editingId !== null) editInputRef.current?.focus();
  }, [editingId]);

  const handleToggle = async (todo: Todo) => {
    try {
      const updated = await todosApi.update(todo.id, {
        title: todo.title,
        isCompleted: !todo.isCompleted,
        tags: todo.tags,
      });
      invalidateCache();
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? updated : t)));
    } catch {
      onError("Failed to update todo");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await todosApi.delete(id);
      invalidateCache();
      const result = await todosApi.getAll(page, PAGE_SIZE);
      cacheRef.current.set(page, result);
      setTotalCount(result.totalCount);
      if (result.data.length === 0 && page > 1) {
        setPage(page - 1);
      } else {
        setTodos(result.data);
      }
    } catch {
      onError("Failed to delete todo");
    }
  };

  const handleEditSave = async (todo: Todo) => {
    const trimmed = editTitle.trim();
    setEditingId(null);
    if (!trimmed || trimmed === todo.title) return;
    try {
      const updated = await todosApi.update(todo.id, {
        title: trimmed,
        isCompleted: todo.isCompleted,
        tags: todo.tags,
      });
      invalidateCache();
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? updated : t)));
    } catch {
      onError("Failed to update todo");
    }
  };

  const handleTagsChange = async (todo: Todo, newTags: string[]) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, tags: newTags } : t))
    );
    try {
      const updated = await todosApi.update(todo.id, {
        title: todo.title,
        isCompleted: todo.isCompleted,
        tags: newTags,
      });
      invalidateCache();
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? updated : t)));
    } catch {
      onError("Failed to update tags");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (loading && todos.length === 0) {
    return (
      <div className="space-y-3 mt-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (totalCount === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        No tasks yet. Add one above!
      </p>
    );
  }

  return (
    <div className="mt-6">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]" />
              <TableHead>Title</TableHead>
              <TableHead className="w-[180px]">Tags</TableHead>
              <TableHead className="w-[90px]">Status</TableHead>
              <TableHead className="w-[80px]">Date</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {todos.map((todo) => (
              <TableRow key={todo.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={todo.isCompleted}
                    onChange={() => handleToggle(todo)}
                    className="h-4 w-4 cursor-pointer accent-primary"
                  />
                </TableCell>
                <TableCell>
                  {editingId === todo.id ? (
                    <Input
                      ref={editInputRef}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => handleEditSave(todo)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleEditSave(todo);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      maxLength={200}
                      className="h-7 text-sm"
                    />
                  ) : (
                    <span
                      onDoubleClick={() => {
                        setEditingId(todo.id);
                        setEditTitle(todo.title);
                      }}
                      className={`cursor-pointer ${
                        todo.isCompleted
                          ? "line-through text-muted-foreground"
                          : ""
                      }`}
                      title="Double-click to edit"
                    >
                      {todo.title}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {editingTagsId === todo.id ? (
                    <div onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        setEditingTagsId(null);
                      }
                    }}>
                      <TagInput
                        value={todo.tags}
                        onChange={(tags) => handleTagsChange(todo, tags)}
                        suggestions={tagSuggestions}
                        placeholder="Add tag..."
                      />
                    </div>
                  ) : (
                    <div
                      className="flex flex-wrap gap-1 cursor-pointer min-h-[24px]"
                      onClick={() => setEditingTagsId(todo.id)}
                      title="Click to edit tags"
                    >
                      {todo.tags.length > 0 ? (
                        todo.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">+tag</span>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={todo.isCompleted ? "success" : "secondary"}>
                    {todo.isCompleted ? "Done" : "Pending"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {formatDate(todo.createdAt)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(todo.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            {totalCount} task{totalCount !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
