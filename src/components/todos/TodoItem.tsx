"use client";

import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Todo {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: number | null;
  dueDate: Date | null;
  doDate: Date | null;
  category: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (todo: Todo) => void;
}

export function TodoItem({ todo, onToggle, onDelete, onEdit }: TodoItemProps) {
  const isDone = todo.status === "done";

  const priorityColors: Record<number, string> = {
    1: "bg-red-100 text-red-700 border-red-200",
    2: "bg-yellow-100 text-yellow-700 border-yellow-200",
    3: "bg-green-100 text-green-700 border-green-200",
  };

  const priorityLabels: Record<number, string> = {
    1: "High",
    2: "Medium",
    3: "Low",
  };

  const categoryColors: Record<string, string> = {
    work: "bg-blue-100 text-blue-700 border-blue-200",
    personal: "bg-purple-100 text-purple-700 border-purple-200",
    chores: "bg-orange-100 text-orange-700 border-orange-200",
    groceries: "bg-green-100 text-green-700 border-green-200",
    finance: "bg-emerald-100 text-emerald-700 border-emerald-200",
    health: "bg-pink-100 text-pink-700 border-pink-200",
    projects: "bg-indigo-100 text-indigo-700 border-indigo-200",
    errands: "bg-amber-100 text-amber-700 border-amber-200",
    shopping: "bg-teal-100 text-teal-700 border-teal-200",
  };

  const formatDate = (date: Date, prefix?: string) => {
    const d = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    const dateOnly = new Date(d);
    dateOnly.setHours(0, 0, 0, 0);

    let label = "";
    if (dateOnly.getTime() === today.getTime()) {
      label = "Today";
    } else if (dateOnly.getTime() === tomorrow.getTime()) {
      label = "Tomorrow";
    } else {
      label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }

    return prefix ? `${prefix} ${label}` : label;
  };

  const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && !isDone;
  const isDoDateToday = todo.doDate && (() => {
    const doDate = new Date(todo.doDate);
    const today = new Date();
    doDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return doDate.getTime() === today.getTime();
  })();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group flex items-start gap-3 p-4 rounded-xl border bg-card transition-all hover:shadow-md",
        isDone && "opacity-60",
        isDoDateToday && !isDone && "ring-2 ring-primary/20"
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
          {todo.category && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs capitalize",
                categoryColors[todo.category.toLowerCase()] || "bg-gray-100 text-gray-700 border-gray-200"
              )}
            >
              {todo.category}
            </Badge>
          )}
          {todo.priority && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                priorityColors[todo.priority]
              )}
            >
              {priorityLabels[todo.priority]}
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
        <div className="flex items-center gap-2 mt-2 flex-wrap">
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
              Due: {formatDate(todo.dueDate)}
            </Badge>
          )}
          {todo.doDate && !isDone && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                isDoDateToday
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-slate-50 text-slate-600 border-slate-200"
              )}
            >
              Start: {formatDate(todo.doDate)}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(todo)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-4 h-4"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
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
    </motion.div>
  );
}

