"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { TodoItem } from "@/components/todos/TodoItem";
import { AddTodo } from "@/components/todos/AddTodo";
import { EditTodoModal } from "@/components/todos/EditTodoModal";
import { AppShell } from "@/components/layout";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";

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

const HIDE_COMPLETED_KEY = "ziggy_hide_completed";

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "done">("all");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [hideCompleted, setHideCompleted] = useState(false);

  // Load hide completed preference
  useEffect(() => {
    const stored = localStorage.getItem(HIDE_COMPLETED_KEY);
    if (stored === "true") {
      setHideCompleted(true);
    }
  }, []);

  // Save hide completed preference
  const toggleHideCompleted = () => {
    const newValue = !hideCompleted;
    setHideCompleted(newValue);
    localStorage.setItem(HIDE_COMPLETED_KEY, String(newValue));
  };

  const fetchTodos = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      
      const queryString = params.toString();
      const response = await fetch(`/api/todos${queryString ? `?${queryString}` : ""}`);
      if (response.ok) {
        const data = await response.json();
        setTodos(data.todos);
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Failed to fetch todos:", error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, categoryFilter]);

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

  const handleEditTodo = (todo: Todo) => {
    setEditingTodo(todo);
  };

  const handleSaveTodo = async (id: string, updates: Partial<Todo>) => {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (response.ok) {
        const updatedTodo = await response.json();
        setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...updatedTodo } : t)));
        // Refresh categories in case a new one was added
        fetchTodos();
      }
    } catch (error) {
      console.error("Failed to update todo:", error);
    }
  };

  const pendingCount = todos.filter((t) => t.status === "pending").length;
  const doneCount = todos.filter((t) => t.status === "done").length;
  
  // Count tasks due today or with doDate today
  const todayCount = todos.filter((t) => {
    if (t.status === "done") return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dueDate = t.dueDate ? new Date(t.dueDate) : null;
    const doDate = t.doDate ? new Date(t.doDate) : null;
    
    if (dueDate) {
      dueDate.setHours(0, 0, 0, 0);
      if (dueDate.getTime() >= today.getTime() && dueDate.getTime() < tomorrow.getTime()) return true;
    }
    if (doDate) {
      doDate.setHours(0, 0, 0, 0);
      if (doDate.getTime() >= today.getTime() && doDate.getTime() < tomorrow.getTime()) return true;
    }
    return false;
  }).length;

  // Category color helpers
  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      work: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700",
      personal: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700",
      chores: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700",
      groceries: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700",
      finance: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700",
      health: "bg-pink-100 text-pink-700 border-pink-300 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-700",
      projects: "bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-700",
      errands: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700",
      shopping: "bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-700",
    };
    return colors[cat.toLowerCase()] || "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600";
  };

  const getCategoryDotColor = (cat: string) => {
    const colors: Record<string, string> = {
      work: "bg-blue-500",
      personal: "bg-purple-500",
      chores: "bg-orange-500",
      groceries: "bg-green-500",
      finance: "bg-emerald-500",
      health: "bg-pink-500",
      projects: "bg-indigo-500",
      errands: "bg-amber-500",
      shopping: "bg-teal-500",
    };
    return colors[cat.toLowerCase()] || "bg-gray-500";
  };

  return (
    <AppShell>
      <div className="min-h-screen bg-background">
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
              <div className="flex items-center gap-2">
                {/* Hide completed toggle */}
                <button
                  onClick={toggleHideCompleted}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors ${
                    hideCompleted 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                  title={hideCompleted ? "Show completed tasks" : "Hide completed tasks"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    {hideCompleted ? (
                      <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>
                    ) : (
                      <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
                    )}
                  </svg>
                  <span className="hidden sm:inline">{hideCompleted ? "Show done" : "Hide done"}</span>
                </button>
                <div className="lg:hidden">
                  <ThemeToggle />
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

        {/* Quick filters */}
        <div className="flex gap-2 mb-4 flex-wrap items-center">
          {/* Today filter - prominent */}
          <Button
            variant={categoryFilter === "__today__" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoryFilter(categoryFilter === "__today__" ? null : "__today__")}
            className="bg-primary/10 border-primary/30 hover:bg-primary/20 text-primary font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 mr-1">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Today ({todayCount})
          </Button>

          <div className="h-6 w-px bg-border mx-1" />

          {/* Status filters */}
          <Button
            variant={statusFilter === "all" && categoryFilter !== "__today__" ? "default" : "outline"}
            size="sm"
            onClick={() => { setStatusFilter("all"); if (categoryFilter === "__today__") setCategoryFilter(null); }}
          >
            All ({todos.length})
          </Button>
          <Button
            variant={statusFilter === "pending" && categoryFilter !== "__today__" ? "default" : "outline"}
            size="sm"
            onClick={() => { setStatusFilter("pending"); if (categoryFilter === "__today__") setCategoryFilter(null); }}
          >
            Pending ({pendingCount})
          </Button>
          <Button
            variant={statusFilter === "done" && categoryFilter !== "__today__" ? "default" : "outline"}
            size="sm"
            onClick={() => { setStatusFilter("done"); if (categoryFilter === "__today__") setCategoryFilter(null); }}
          >
            Completed ({doneCount})
          </Button>
        </div>

        {/* Category filter tabs with colors */}
        {categories.length > 0 && (
          <div className="flex gap-2 mb-6 flex-wrap overflow-x-auto pb-2">
            <Button
              variant={categoryFilter === null || categoryFilter === "__today__" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setCategoryFilter(null)}
              className="text-xs shrink-0"
            >
              All Categories
            </Button>
            {categories.map((cat) => {
              const isSelected = categoryFilter === cat;
              const colorClass = getCategoryColor(cat);
              return (
                <Button
                  key={cat}
                  variant="ghost"
                  size="sm"
                  onClick={() => setCategoryFilter(cat)}
                  className={`text-xs capitalize shrink-0 border ${isSelected ? colorClass : "border-transparent hover:border-border"}`}
                >
                  <span className={`w-2 h-2 rounded-full mr-1.5 ${getCategoryDotColor(cat)}`} />
                  {cat}
                </Button>
              );
            })}
          </div>
        )}

        {/* Todo list */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-muted-foreground mt-4">Loading tasks...</p>
          </div>
        ) : todos.length === 0 ? (
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
              {statusFilter === "all" && !categoryFilter
                ? "No tasks yet"
                : statusFilter === "pending"
                ? "No pending tasks"
                : statusFilter === "done"
                ? "No completed tasks"
                : `No tasks in "${categoryFilter}"`}
            </h3>
            <p className="text-muted-foreground">
              {statusFilter === "all" && !categoryFilter
                ? "Add a task above or chat with Ziggy to get started!"
                : ""}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {todos
              .filter((todo) => !hideCompleted || todo.status !== "done")
              .map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={handleToggleTodo}
                  onDelete={handleDeleteTodo}
                  onEdit={handleEditTodo}
                />
              ))}
          </div>
        )}
        </main>

        {/* Edit Modal */}
        <EditTodoModal
          todo={editingTodo}
          isOpen={editingTodo !== null}
          onClose={() => setEditingTodo(null)}
          onSave={handleSaveTodo}
          categories={categories}
        />
      </div>
    </AppShell>
  );
}

