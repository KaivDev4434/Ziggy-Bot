"use client";

import { useState, useEffect, useCallback } from "react";
import { HabitCard } from "@/components/habits/HabitCard";
import { AddHabit } from "@/components/habits/AddHabit";
import { AppShell } from "@/components/layout";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { toast } from "sonner";
import type { FrequencyType } from "@/lib/habits";

interface HabitRecord {
  id: string;
  date: Date;
  completed: boolean;
}

interface Habit {
  id: string;
  name: string;
  frequency: string;
  frequencyType?: string;
  frequencyDays?: string | null;
  frequencyTarget?: number | null;
  bestStreak?: number;
  active: boolean;
  createdAt: Date;
  records: HabitRecord[];
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHabits = useCallback(async () => {
    try {
      const response = await fetch("/api/habits");
      if (response.ok) {
        const data = await response.json();
        setHabits(data.habits);
      }
    } catch (error) {
      console.error("Failed to fetch habits:", error);
      toast.error("Failed to load habits");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const handleAddHabit = async (habit: {
    name: string;
    frequencyType: FrequencyType;
    frequencyDays?: number[];
    frequencyTarget?: number;
  }) => {
    try {
      const response = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(habit),
      });
      if (response.ok) {
        fetchHabits();
        toast.success("Habit added");
      }
    } catch (error) {
      console.error("Failed to add habit:", error);
      toast.error("Failed to add habit");
    }
  };

  const handleToggleToday = async (habitId: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/habits/${habitId}/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      if (response.ok) {
        fetchHabits();
      }
    } catch (error) {
      console.error("Failed to toggle habit:", error);
      toast.error("Failed to update habit");
    }
  };

  const handleEditHabit = async (habitId: string, updates: Record<string, unknown>) => {
    try {
      const response = await fetch(`/api/habits/${habitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (response.ok) {
        fetchHabits(); // Re-fetch to get clean data with parsed fields
      }
    } catch (error) {
      console.error("Failed to edit habit:", error);
      toast.error("Failed to update habit");
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    try {
      const response = await fetch(`/api/habits/${habitId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setHabits((prev) => prev.filter((h) => h.id !== habitId));
        toast.success("Habit deleted");
      }
    } catch (error) {
      console.error("Failed to delete habit:", error);
      toast.error("Failed to delete habit");
    }
  };

  // Calculate stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const completedToday = habits.filter((h) =>
    h.records.some((r) => {
      const recordDate = new Date(r.date);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate.getTime() === today.getTime() && r.completed;
    })
  ).length;

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
                  <h1 className="text-xl font-semibold text-foreground">
                    Habits
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {completedToday} of {habits.length} completed today
                  </p>
                </div>
              </div>
              <div className="lg:hidden">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-4xl mx-auto px-6 py-6">
          {/* Add Habit */}
          <div className="mb-6">
            <AddHabit onAdd={handleAddHabit} />
          </div>

          {/* Habits grid */}
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <Skeleton className="h-6 w-8" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      {[...Array(7)].map((_, j) => (
                        <div key={j} className="flex flex-col items-center gap-1">
                          <Skeleton className="h-3 w-3" />
                          <Skeleton className="h-8 w-8 rounded-full" />
                        </div>
                      ))}
                    </div>
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : habits.length === 0 ? (
            <EmptyState
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-8 h-8"
                >
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              }
              title="No habits yet"
              description="Add a habit above or tell Ziggy about habits you want to track!"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {habits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  onToggleToday={handleToggleToday}
                  onDelete={handleDeleteHabit}
                  onEdit={handleEditHabit}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </AppShell>
  );
}
