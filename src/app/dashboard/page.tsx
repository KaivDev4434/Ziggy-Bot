"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/layout";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";
import { toast } from "sonner";

interface DashboardData {
  todos: {
    pending: number;
    completedThisWeek: number;
    total: number;
    todayTasks: { id: string; title: string; priority: number | null }[];
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

interface Suggestion {
  id: string;
  type: "overdue" | "streak-risk" | "pattern" | "reminder" | "achievement";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
  };
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardRes, suggestionsRes] = await Promise.all([
          fetch("/api/dashboard"),
          fetch("/api/suggestions"),
        ]);
        
        if (dashboardRes.ok) {
          const dashboardData = await dashboardRes.json();
          setData(dashboardData);
        }
        
        if (suggestionsRes.ok) {
          const suggestionsData = await suggestionsRes.json();
          setSuggestions(suggestionsData.suggestions || []);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <AppShell>
        <div className="min-h-screen bg-background">
          {/* Header skeleton */}
          <header className="bg-gradient-to-br from-primary/10 via-background to-accent/10 border-b border-border">
            <div className="max-w-4xl mx-auto px-6 py-8">
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-5 w-32" />
            </div>
          </header>
          {/* Content skeleton */}
          <main className="max-w-4xl mx-auto px-6 py-6 space-y-6">
            {/* Quick Actions skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="h-24">
                  <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
                    <Skeleton className="h-6 w-6 rounded" />
                    <Skeleton className="h-4 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
            {/* Stats skeleton */}
            <div>
              <Skeleton className="h-4 w-24 mb-3" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-6 w-6 mb-2" />
                      <Skeleton className="h-8 w-16 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            {/* Habits skeleton */}
            <div>
              <Skeleton className="h-4 w-20 mb-3" />
              <div className="grid gap-2 md:grid-cols-2">
                {[...Array(2)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </main>
        </div>
      </AppShell>
    );
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <AppShell>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-gradient-to-br from-primary/10 via-background to-accent/10 border-b border-border">
          <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <div>
                <motion.h1
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl font-bold text-foreground"
                >
                  {greeting}! ✨
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-muted-foreground mt-1"
                >
                  {today}
                </motion.p>
              </div>
              <div className="lg:hidden">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-4xl mx-auto px-6 py-6">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Quick Actions */}
            <motion.section variants={itemVariants}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <QuickAction
                  href="/"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  }
                  label="Chat"
                  color="bg-primary/10 text-primary hover:bg-primary/20"
                />
                <QuickAction
                  href="/todos"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                      <path d="M9 11l3 3L22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                  }
                  label="Tasks"
                  badge={data?.todos.pending}
                  color="bg-primary/10 text-primary hover:bg-primary/20"
                />
                <QuickAction
                  href="/habits"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                  }
                  label="Habits"
                  badge={`${data?.habits.completedToday || 0}/${data?.habits.total || 0}`}
                  color="bg-success/10 text-success hover:bg-success/20"
                />
                <QuickAction
                  href="/todos?category=__today__"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  }
                  label="Today"
                  color="bg-accent/10 text-accent hover:bg-accent/20"
                />
              </div>
            </motion.section>

            {/* Ziggy Suggests */}
            {suggestions.length > 0 && (
              <motion.section variants={itemVariants}>
                <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                  ✨ Ziggy Suggests
                </h2>
                <div className="grid gap-2 md:grid-cols-2">
                  {suggestions.map((suggestion) => (
                    <Card
                      key={suggestion.id}
                      className={`border-l-4 ${
                        suggestion.priority === "high"
                          ? "border-l-destructive"
                          : suggestion.priority === "medium"
                          ? "border-l-warning"
                          : "border-l-success"
                      }`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm">
                                {suggestion.type === "overdue" && "⚠️"}
                                {suggestion.type === "streak-risk" && "🔥"}
                                {suggestion.type === "reminder" && "⏰"}
                                {suggestion.type === "achievement" && "🎉"}
                                {suggestion.type === "pattern" && "📊"}
                              </span>
                              <span className="font-medium text-sm">
                                {suggestion.title}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {suggestion.description}
                            </p>
                          </div>
                          {suggestion.action?.href && (
                            <Link href={suggestion.action.href}>
                              <Button variant="outline" size="sm" className="shrink-0">
                                {suggestion.action.label}
                              </Button>
                            </Link>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Stats Overview */}
            <motion.section variants={itemVariants}>
              <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  value={data?.todos.pending || 0}
                  label="Pending"
                  icon="📋"
                />
                <StatCard
                  value={data?.todos.completedThisWeek || 0}
                  label="Done this week"
                  icon="✅"
                />
                <StatCard
                  value={`${data?.habits.weeklyCompletionRate || 0}%`}
                  label="Habit rate"
                  icon="📈"
                />
                <StatCard
                  value={data?.landmarks.length || 0}
                  label="Milestones"
                  icon="🏆"
                />
              </div>
            </motion.section>

            {/* Habit Streaks */}
            {data?.habits.streaks && data.habits.streaks.length > 0 && (
              <motion.section variants={itemVariants}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Habits</h2>
                  <Link href="/habits" className="text-xs text-primary hover:underline">View all</Link>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {data.habits.streaks.slice(0, 4).map((habit) => (
                    <Card key={habit.id} className="overflow-hidden">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                                habit.completedToday
                                  ? "bg-success/10 text-success"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {habit.completedToday ? "✓" : "○"}
                            </div>
                            <span className="font-medium text-sm">{habit.name}</span>
                          </div>
                          {habit.streak > 0 && (
                            <div className="flex items-center gap-1 text-warning">
                              <span>🔥</span>
                              <span className="font-bold text-sm">{habit.streak}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Recent Landmarks */}
            {data?.landmarks && data.landmarks.length > 0 && (
              <motion.section variants={itemVariants}>
                <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">Milestones</h2>
                <Card>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border">
                      {data.landmarks.slice(0, 3).map((landmark) => (
                        <div key={landmark.id} className="p-3 flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-accent/20 to-accent/40 rounded-full flex items-center justify-center shrink-0">
                            <span>🏆</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{landmark.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(landmark.date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.section>
            )}

            {/* Empty state */}
            {(!data || (data.todos.total === 0 && data.habits.total === 0 && data.landmarks.length === 0)) && (
              <motion.div variants={itemVariants} className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-white font-bold text-3xl">Z</span>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  Welcome to Ziggy!
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  Start chatting with Ziggy to add tasks, habits, and milestones.
                </p>
                <Link href="/">
                  <Button size="lg">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 mr-2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    Start Chatting
                  </Button>
                </Link>
              </motion.div>
            )}
          </motion.div>
        </main>
      </div>
    </AppShell>
  );
}

function QuickAction({
  href,
  icon,
  label,
  badge,
  color,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: string | number;
  color: string;
}) {
  return (
    <Link href={href}>
      <Card className={`h-full transition-all hover:shadow-md ${color} border-transparent`}>
        <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
          {icon}
          <span className="font-medium text-sm">{label}</span>
          {badge !== undefined && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function StatCard({
  value,
  label,
  icon,
}: {
  value: string | number;
  label: string;
  icon: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl">{icon}</span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
