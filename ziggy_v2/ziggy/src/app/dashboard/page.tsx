"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/BottomNav";
import Link from "next/link";

interface DashboardData {
  todos: {
    pending: number;
    completedThisWeek: number;
    total: number;
  };
  habits: {
    total: number;
    completedToday: number;
    weeklyCompletionRate: number;
    streaks: {
      id: string;
      name: string;
      streak: number;
      completedToday: boolean;
    }[];
  };
  landmarks: {
    id: string;
    title: string;
    date: string;
    notes: string | null;
  }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/dashboard");
        if (response.ok) {
          const dashboardData = await response.json();
          setData(dashboardData);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground mt-4">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">Z</span>
              </div>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Your progress at a glance
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Today's Overview */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Today&apos;s Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon="📋"
              label="Pending Tasks"
              value={data?.todos.pending || 0}
              href="/todos"
            />
            <StatCard
              icon="✅"
              label="Completed This Week"
              value={data?.todos.completedThisWeek || 0}
              href="/todos"
            />
            <StatCard
              icon="🔥"
              label="Habits Done Today"
              value={`${data?.habits.completedToday || 0}/${
                data?.habits.total || 0
              }`}
              href="/habits"
            />
            <StatCard
              icon="📈"
              label="Weekly Habit Rate"
              value={`${data?.habits.weeklyCompletionRate || 0}%`}
              href="/habits"
            />
          </div>
        </section>

        {/* Habit Streaks */}
        {data?.habits.streaks && data.habits.streaks.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Habit Streaks</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {data.habits.streaks.map((habit) => (
                <Card key={habit.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            habit.completedToday
                              ? "bg-green-100 text-green-600"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {habit.completedToday ? "✓" : "○"}
                        </div>
                        <div>
                          <p className="font-medium">{habit.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {habit.completedToday
                              ? "Completed today"
                              : "Not yet done"}
                          </p>
                        </div>
                      </div>
                      {habit.streak > 0 && (
                        <div className="flex items-center gap-1 text-orange-500">
                          <span className="text-xl">🔥</span>
                          <span className="font-bold text-lg">
                            {habit.streak}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Recent Landmarks */}
        {data?.landmarks && data.landmarks.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Life Landmarks</h2>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {data.landmarks.map((landmark) => (
                    <div
                      key={landmark.id}
                      className="p-4 flex items-start gap-3"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-accent/20 to-accent/40 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-lg">🏆</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{landmark.title}</p>
                        {landmark.notes && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {landmark.notes}
                          </p>
                        )}
                        <Badge variant="outline" className="mt-2 text-xs">
                          {new Date(landmark.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Empty state */}
        {(!data ||
          (data.todos.total === 0 &&
            data.habits.total === 0 &&
            data.landmarks.length === 0)) && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <span className="text-white font-bold text-3xl">Z</span>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-3">
              Welcome to Ziggy!
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Start chatting with Ziggy to add tasks, habits, and milestones.
              Your progress will appear here.
            </p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
}: {
  icon: string;
  label: string;
  value: string | number;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-3xl">{icon}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </CardContent>
      </Card>
    </Link>
  );
}


