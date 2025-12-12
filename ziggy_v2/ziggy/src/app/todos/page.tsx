"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { TodoItem } from "@/components/todos/TodoItem";
import { AddTodo } from "@/components/todos/AddTodo";
import { BottomNav } from "@/components/BottomNav";
import Link from "next/link";

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

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");
  const [isLoading, setIsLoading] = useState(true);

  const fetchTodos = useCallback(async () => {
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const response = await fetch(`/api/todos${params}`);
      if (response.ok) {
        const data = await response.json();
        setTodos(data.todos);
      }
    } catch (error) {
      console.error("Failed to fetch todos:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const handleAddTodo = async (title: string) => {
    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (response.ok) {
        fetchTodos();
      }
    } catch (error) {
      console.error("Failed to add todo:", error);
    }
  };

  const handleToggleTodo = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        setTodos((prev) =>
          prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status,
                  completedAt: status === "done" ? new Date() : null,
                }
              : t
          )
        );
      }
    } catch (error) {
      console.error("Failed to toggle todo:", error);
    }
  };

  const handleDeleteTodo = async (id: string) => {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setTodos((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete todo:", error);
    }
  };

  const filteredTodos =
    filter === "all" ? todos : todos.filter((t) => t.status === filter);

  const pendingCount = todos.filter((t) => t.status === "pending").length;
  const doneCount = todos.filter((t) => t.status === "done").length;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-lg">Z</span>
                </div>
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Tasks</h1>
                <p className="text-sm text-muted-foreground">
                  {pendingCount} pending, {doneCount} completed
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-6 py-6">
        {/* Add Todo */}
        <div className="mb-6">
          <AddTodo onAdd={handleAddTodo} />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All ({todos.length})
          </Button>
          <Button
            variant={filter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("pending")}
          >
            Pending ({pendingCount})
          </Button>
          <Button
            variant={filter === "done" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("done")}
          >
            Completed ({doneCount})
          </Button>
        </div>

        {/* Todo list */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-muted-foreground mt-4">Loading tasks...</p>
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-8 h-8 text-muted-foreground"
              >
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              {filter === "all"
                ? "No tasks yet"
                : filter === "pending"
                ? "No pending tasks"
                : "No completed tasks"}
            </h3>
            <p className="text-muted-foreground">
              {filter === "all"
                ? "Add a task above or chat with Ziggy to get started!"
                : ""}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTodos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={handleToggleTodo}
                onDelete={handleDeleteTodo}
              />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
