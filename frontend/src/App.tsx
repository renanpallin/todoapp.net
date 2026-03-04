import { useState, useCallback, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { LogOut, Moon, Sun, HelpCircle, X } from "lucide-react";
import { todosApi } from "./api/todos";
import { tagsApi } from "./api/tags";
import { useAuth } from "./context/AuthContext";
import { Button } from "@/components/ui/button";
import TodoForm from "./components/TodoForm";
import TodoTable from "./components/TodoTable";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-background border rounded-lg shadow-lg w-full max-w-sm mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base">How to use</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li><span className="text-foreground font-medium">Add a task</span> — Type a title and press <kbd className="px-1 py-0.5 rounded border text-xs">Enter</kbd> or click Add.</li>
          <li><span className="text-foreground font-medium">Tags</span> — Type a tag name and press <kbd className="px-1 py-0.5 rounded border text-xs">Enter</kbd> or <kbd className="px-1 py-0.5 rounded border text-xs">,</kbd> to add. Tags are optional.</li>
          <li><span className="text-foreground font-medium">Edit title</span> — Double-click a task title to edit inline.</li>
          <li><span className="text-foreground font-medium">Edit tags</span> — Click the tags column to edit a task's tags.</li>
          <li><span className="text-foreground font-medium">Complete</span> — Check the checkbox to mark as done.</li>
        </ul>
      </div>
    </div>
  );
}

function TodoPage() {
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [dark, setDark] = useState(() => localStorage.getItem("theme") !== "light");
  const [helpOpen, setHelpOpen] = useState(false);
  const { username, logout } = useAuth();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const fetchTags = useCallback(async () => {
    const tags = await tagsApi.getAll();
    setTagSuggestions(tags);
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags, refreshKey]);

  const handleCreate = useCallback(
    async (title: string, tags: string[]) => {
      try {
        setError(null);
        await todosApi.create({ title, tags: tags.length > 0 ? tags : undefined });
        setRefreshKey((k) => k + 1);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create todo"
        );
      }
    },
    []
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">Todo App</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{username}</span>
            <Button variant="ghost" size="icon" onClick={() => setHelpOpen(true)} className="h-8 w-8">
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDark((d) => !d)} className="h-8 w-8">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <TodoForm onSubmit={handleCreate} tagSuggestions={tagSuggestions} />

        {error && (
          <p className="text-sm text-destructive text-center mt-4">{error}</p>
        )}

        <TodoTable onError={setError} refreshKey={refreshKey} tagSuggestions={tagSuggestions} />
      </main>
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/" /> : <RegisterPage />}
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <TodoPage />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
