"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PRIORITY_OPTIONS, CATEGORY_COLORS } from "@/lib/constants";
import type { Todo, TodoPriority } from "@/types";

interface EditTodoModalProps {
  todo: Todo | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Todo>) => Promise<void>;
  categories: string[];
}

export function EditTodoModal({ todo, isOpen, onClose, onSave, categories }: EditTodoModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TodoPriority | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [doDate, setDoDate] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (todo) {
      setTitle(todo.title);
      setDescription(todo.description || "");
      setPriority(todo.priority);
      setDueDate(todo.dueDate ? formatDateForInput(new Date(todo.dueDate)) : "");
      setDoDate(todo.doDate ? formatDateForInput(new Date(todo.doDate)) : "");
      setCategory(todo.category);
      setNewCategory("");
    }
  }, [todo]);

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const handleSave = async () => {
    if (!todo || !title.trim()) return;

    setIsSaving(true);
    try {
      const finalCategory = newCategory.trim() || category;
      await onSave(todo.id, {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        doDate: doDate ? new Date(doDate) : null,
        category: finalCategory,
      });
      toast.success("Task updated");
      onClose();
    } catch (error) {
      console.error("Failed to save todo:", error);
      toast.error("Failed to save task");
    } finally {
      setIsSaving(false);
    }
  };

  const allCategories = Array.from(new Set([...categories, ...(category && !categories.includes(category) ? [category] : [])]));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-50"
          />

          {/* Centering wrapper -- flex-based, no transforms to conflict with framer-motion */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg max-h-[80vh] bg-card rounded-2xl shadow-xl flex flex-col overflow-hidden pointer-events-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b shrink-0">
                <h2 className="text-lg font-semibold">Edit Task</h2>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </Button>
              </div>

              {/* Content -- scrollable */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                {/* Title */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Title</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Task title"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Description</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a description..."
                    rows={3}
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Priority</label>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant={priority === null ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setPriority(null)}
                    >
                      None
                    </Button>
                    {PRIORITY_OPTIONS.map((opt) => (
                      <Button
                        key={opt.value}
                        type="button"
                        variant={priority === opt.value ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setPriority(opt.value)}
                        className={cn(priority === opt.value && opt.color)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Due Date</label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Start Date</label>
                    <Input
                      type="date"
                      value={doDate}
                      onChange={(e) => setDoDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Category</label>
                  <div className="flex gap-2 flex-wrap mb-2">
                    <Button
                      type="button"
                      variant={category === null && !newCategory ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => { setCategory(null); setNewCategory(""); }}
                    >
                      None
                    </Button>
                    {allCategories.map((cat) => (
                      <Button
                        key={cat}
                        type="button"
                        variant={category === cat && !newCategory ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => { setCategory(cat); setNewCategory(""); }}
                        className={cn(
                          "capitalize",
                          category === cat && !newCategory && (CATEGORY_COLORS[cat.toLowerCase()] || "bg-muted text-muted-foreground")
                        )}
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Or type a new category..."
                    className="mt-2"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 p-4 border-t bg-muted/30 shrink-0">
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!title.trim() || isSaving}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
