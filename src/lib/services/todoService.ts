// Todo business logic and database operations

import prisma from "@/lib/db";
import type { ExtractedTodo } from "@/types";

// --- Database Operations ---

export async function getAllTodos() {
  return prisma.todo.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function getPendingTodos() {
  return prisma.todo.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTodoById(id: string) {
  return prisma.todo.findUnique({ where: { id } });
}

export async function createTodo(data: {
  title: string;
  description?: string | null;
  priority?: number | null;
  dueDate?: Date | null;
  doDate?: Date | null;
  category?: string | null;
}) {
  return prisma.todo.create({
    data: {
      title: data.title,
      description: data.description || null,
      priority: data.priority || null,
      dueDate: data.dueDate || null,
      doDate: data.doDate || null,
      category: data.category || null,
    },
  });
}

export async function updateTodo(id: string, data: Record<string, unknown>) {
  return prisma.todo.update({ where: { id }, data });
}

export async function deleteTodo(id: string) {
  return prisma.todo.delete({ where: { id } });
}

export async function completeTodo(id: string) {
  return prisma.todo.update({
    where: { id },
    data: { status: "done", completedAt: new Date() },
  });
}

// --- AI Action Processing ---

/**
 * Process a todo action extracted by the AI.
 * Handles create, update, complete, and delete with fuzzy matching.
 */
export async function processTodoAction(
  todo: ExtractedTodo,
  existingTodos: { id: string; title: string; status: string }[]
) {
  const action = todo.action || "create";

  // For update/complete/delete, try to find matching todo
  let matchedTodoId = todo.id;

  if (!matchedTodoId && action !== "create") {
    const normalizedTitle = todo.title.toLowerCase().trim();
    const match = existingTodos.find((t) => {
      const existingTitle = t.title.toLowerCase().trim();
      return (
        existingTitle === normalizedTitle ||
        existingTitle.includes(normalizedTitle) ||
        normalizedTitle.includes(existingTitle)
      );
    });
    matchedTodoId = match?.id;
  }

  switch (action) {
    case "create": {
      const normalizedTitle = todo.title.toLowerCase().trim();
      const existingMatch = existingTodos.find(
        (t) => t.title.toLowerCase().trim() === normalizedTitle
      );

      if (existingMatch) {
        // Update existing instead of creating duplicate
        const updateData: Record<string, unknown> = {};
        if (todo.description) updateData.description = todo.description;
        if (todo.priority) updateData.priority = todo.priority;
        if (todo.dueDate) updateData.dueDate = new Date(todo.dueDate);
        if (todo.doDate) updateData.doDate = new Date(todo.doDate);
        if (todo.category) updateData.category = todo.category;

        if (Object.keys(updateData).length > 0) {
          await updateTodo(existingMatch.id, updateData);
        }
      } else {
        await createTodo({
          title: todo.title,
          description: todo.description,
          priority: todo.priority,
          dueDate: todo.dueDate ? new Date(todo.dueDate) : null,
          doDate: todo.doDate ? new Date(todo.doDate) : null,
          category: todo.category,
        });
      }
      break;
    }

    case "update":
      if (matchedTodoId) {
        const updateData: Record<string, unknown> = {};
        if (todo.title) updateData.title = todo.title;
        if (todo.description !== undefined) updateData.description = todo.description;
        if (todo.priority !== undefined) updateData.priority = todo.priority;
        if (todo.dueDate !== undefined)
          updateData.dueDate = todo.dueDate ? new Date(todo.dueDate) : null;
        if (todo.doDate !== undefined)
          updateData.doDate = todo.doDate ? new Date(todo.doDate) : null;
        if (todo.category !== undefined) updateData.category = todo.category;

        await updateTodo(matchedTodoId, updateData);
      } else {
        await createTodo({
          title: todo.title,
          description: todo.description,
          priority: todo.priority,
          dueDate: todo.dueDate ? new Date(todo.dueDate) : null,
          doDate: todo.doDate ? new Date(todo.doDate) : null,
          category: todo.category,
        });
      }
      break;

    case "complete":
      if (matchedTodoId) {
        await completeTodo(matchedTodoId);
      }
      break;

    case "delete":
      if (matchedTodoId) {
        await deleteTodo(matchedTodoId);
      }
      break;
  }
}

// --- Dashboard Stats ---

export async function getTodoStats() {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [pending, completedThisWeek, total] = await Promise.all([
    prisma.todo.count({ where: { status: "pending" } }),
    prisma.todo.count({
      where: { status: "done", completedAt: { gte: weekAgo } },
    }),
    prisma.todo.count(),
  ]);

  return { pending, completedThisWeek, total };
}
