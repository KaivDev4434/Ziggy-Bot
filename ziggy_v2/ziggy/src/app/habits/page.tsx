"use client";

import { useState, useEffect, useCallback } from "react";
import { HabitCard } from "@/components/habits/HabitCard";
import { AddHabit } from "@/components/habits/AddHabit";
import { BottomNav } from "@/components/BottomNav";
import Link from "next/link";

interface HabitRecord {
  id: string;
  date: Date;
  completed: boolean;
}

interface Habit {
  id: string;
  name: string;
  frequency: string;
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
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const handleAddHabit = async (name: string, frequency: string) => {
    try {
      const response = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, frequency }),
      });
      if (response.ok) {
        fetchHabits();
      }
    } catch (error) {
      console.error("Failed to add habit:", error);
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
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    try {
      const response = await fetch(`/api/habits/${habitId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setHabits((prev) => prev.filter((h) => h.id !== habitId));
      }
    } catch (error) {
      console.error("Failed to delete habit:", error);
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
                <h1 className="text-xl font-semibold text-foreground">
                  Habits
                </h1>
                <p className="text-sm text-muted-foreground">
                  {completedToday} of {habits.length} completed today
                </p>
              </div>
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
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-muted-foreground mt-4">Loading habits...</p>
          </div>
        ) : habits.length === 0 ? (
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
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              No habits yet
            </h3>
            <p className="text-muted-foreground">
              Add a habit above or tell Ziggy about habits you want to track!
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                onToggleToday={handleToggleToday}
                onDelete={handleDeleteHabit}
              />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}


