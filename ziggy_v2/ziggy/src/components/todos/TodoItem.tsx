"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Todo {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  dueDate: Date | null;
  createdAt: Date;
  completedAt: Date | null;
}

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}

export function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  const isDone = todo.status === "done";

  const priorityColors = {
    1: "bg-red-100 text-red-700 border-red-200",
    2: "bg-yellow-100 text-yellow-700 border-yellow-200",
    3: "bg-green-100 text-green-700 border-green-200",
  };

  const priorityLabels = {
    1: "High",
    2: "Medium",
    3: "Low",
  };

  const formatDueDate = (date: Date) => {
    const d = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && !isDone;

  return (
    <div
      className={cn(
        "group flex items-start gap-3 p-4 rounded-xl border bg-card transition-all hover:shadow-md",
        isDone && "opacity-60"
      )}
    >
      <Checkbox
        checked={isDone}
        onCheckedChange={() =>
          onToggle(todo.id, isDone ? "pending" : "done")
        }
        className="mt-1"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "font-medium text-foreground",
              isDone && "line-through text-muted-foreground"
            )}
          >
            {todo.title}
          </span>
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              priorityColors[todo.priority as keyof typeof priorityColors]
            )}
          >
            {priorityLabels[todo.priority as keyof typeof priorityLabels]}
          </Badge>
          {todo.dueDate && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                isOverdue
                  ? "bg-red-50 text-red-600 border-red-200"
                  : "bg-blue-50 text-blue-600 border-blue-200"
              )}
            >
              {formatDueDate(todo.dueDate)}
            </Badge>
          )}
        </div>
        {todo.description && (
          <p
            className={cn(
              "text-sm text-muted-foreground mt-1",
              isDone && "line-through"
            )}
          >
            {todo.description}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={() => onDelete(todo.id)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-4 h-4"
        >
          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </Button>
    </div>
  );
}
