import { useState, FormEvent } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TagInput from "./TagInput";

interface Props {
  onSubmit: (title: string, tags: string[]) => void;
  tagSuggestions?: string[];
}

export default function TodoForm({ onSubmit, tagSuggestions = [] }: Props) {
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onSubmit(trimmed, tags);
    setTitle("");
    setTags([]);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs to be done?"
        maxLength={200}
        aria-label="Todo title"
        className="flex-[2]"
      />
      <div className="flex-1 min-w-0">
        <TagInput
          value={tags}
          onChange={setTags}
          suggestions={tagSuggestions}
          placeholder="Tags (optional)"
        />
      </div>
      <Button type="submit" size="default" className="shrink-0">
        <Plus className="h-4 w-4 mr-1" />
        Add
      </Button>
    </form>
  );
}
