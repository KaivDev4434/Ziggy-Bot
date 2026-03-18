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
    streaks: { id: string; name: string; streak: number; completedToday: boolean }[];
  };
  landmarks: { id: string; title: string; date: string; notes: string | null }[];
  mood: {
    avgMood: number | null;
    avgEnergy: number | null;
    entryCount: number;
    sparkline: (number | null)[];
  };
  finance: {
    weeklySpend: number;
    topCategory: { name: string; amount: number } | null;
    transactionCount: number;
  };
  people: {
    followUpCount: number;
    overdueCount: number;
    upcoming: { personName: string; personId: string; followUp: string | null; dueDate: string | null; overdue: boolean }[];
  };
  media: {
    inProgress: { id: string; title: string; type: string; rating: number | null }[];
  };
  weeklySummary: { report: string; weekStart: string } | null;
}

interface Suggestion {
  id: string;
  type: "overdue" | "streak-risk" | "pattern" | "reminder" | "achievement";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  action?: { label: string; href?: string };
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };

// ── Sparkline ────────────────────────────────────────────────────────────────
function MoodSparkline({ data }: { data: (number | null)[] }) {
  const max = 10;
  const w = 100, h = 32;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = v !== null ? h - (v / max) * h : null;
    return { x, y, v };
  });
  const validPts = pts.filter((p) => p.y !== null) as { x: number; y: number; v: number }[];
  if (validPts.length < 2) {
    return <span className="text-xs text-muted-foreground">Not enough data</span>;
  }
  const d = validPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8" preserveAspectRatio="none">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" strokeLinecap="round" strokeLinejoin="round" />
      {validPts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2" className="fill-primary" />
      ))}
    </svg>
  );
}

const TYPE_ICONS: Record<string, string> = { book: "📚", movie: "🎬", series: "📺" };

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
        if (dashboardRes.ok) setData(await dashboardRes.json());
        if (suggestionsRes.ok) setSuggestions((await suggestionsRes.json()).suggestions || []);
      } catch {
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
          <header className="bg-gradient-to-br from-primary/10 via-background to-accent/10 border-b border-border">
            <div className="max-w-4xl mx-auto px-6 py-8">
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-5 w-32" />
            </div>
          </header>
          <main className="max-w-4xl mx-auto px-6 py-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => <Card key={i} className="h-24"><CardContent className="p-4 flex flex-col items-center justify-center gap-2"><Skeleton className="h-6 w-6 rounded" /><Skeleton className="h-4 w-16" /></CardContent></Card>)}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-6 w-6 mb-2" /><Skeleton className="h-8 w-16 mb-1" /><Skeleton className="h-3 w-20" /></CardContent></Card>)}
            </div>
          </main>
        </div>
      </AppShell>
    );
  }

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const isEmpty = !data || (data.todos.total === 0 && data.habits.total === 0 && data.landmarks.length === 0);

  return (
    <AppShell>
      <div className="min-h-screen bg-background pb-24 lg:pb-8">
        {/* Header */}
        <header className="bg-gradient-to-br from-primary/10 via-background to-accent/10 border-b border-border">
          <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <div>
                <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold">
                  {greeting}! ✨
                </motion.h1>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-muted-foreground mt-1">
                  {today}
                </motion.p>
              </div>
              <div className="lg:hidden"><ThemeToggle /></div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-6">
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">

            {/* Quick Actions */}
            <motion.section variants={itemVariants}>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {[
                  { href: "/", icon: "💬", label: "Chat" },
                  { href: "/todos", icon: "✅", label: "Tasks", badge: data?.todos.pending },
                  { href: "/habits", icon: "🔥", label: "Habits", badge: `${data?.habits.completedToday || 0}/${data?.habits.total || 0}` },
                  { href: "/mood", icon: "😊", label: "Mood" },
                  { href: "/finance", icon: "💰", label: "Finance" },
                  { href: "/people", icon: "👥", label: "People", badge: (data?.people.overdueCount ?? 0) > 0 ? data!.people.overdueCount : undefined },
                ].map((item) => (
                  <Link key={item.href} href={item.href}>
                    <Card className="h-full hover:shadow-md transition-all border-border hover:border-primary/40">
                      <CardContent className="p-3 flex flex-col items-center justify-center text-center gap-1">
                        <span className="text-xl">{item.icon}</span>
                        <span className="font-medium text-xs">{item.label}</span>
                        {item.badge !== undefined && item.badge !== "0/0" && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">{item.badge}</Badge>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </motion.section>

            {/* Ziggy Suggests */}
            {suggestions.length > 0 && (
              <motion.section variants={itemVariants}>
                <h2 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">✨ Ziggy Suggests</h2>
                <div className="grid gap-2 md:grid-cols-2">
                  {suggestions.map((s) => (
                    <Card key={s.id} className={`border-l-4 ${s.priority === "high" ? "border-l-destructive" : s.priority === "medium" ? "border-l-warning" : "border-l-success"}`}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-sm">{s.type === "overdue" ? "⚠️" : s.type === "streak-risk" ? "🔥" : s.type === "reminder" ? "⏰" : s.type === "achievement" ? "🎉" : "📊"}</span>
                              <span className="font-medium text-sm">{s.title}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{s.description}</p>
                          </div>
                          {s.action?.href && (
                            <Link href={s.action.href}><Button variant="outline" size="sm" className="shrink-0">{s.action.label}</Button></Link>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Stats row */}
            <motion.section variants={itemVariants}>
              <h2 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard value={data?.todos.pending || 0} label="Pending tasks" icon="📋" />
                <StatCard value={data?.todos.completedThisWeek || 0} label="Done this week" icon="✅" />
                <StatCard value={`${data?.habits.weeklyCompletionRate || 0}%`} label="Habit rate" icon="📈" />
                <StatCard value={data?.landmarks.length || 0} label="Milestones" icon="🏆" />
              </div>
            </motion.section>

            {/* ── Phase 4 panels ─────────────────────────────────────────── */}

            {/* Mood + Finance side by side */}
            <motion.section variants={itemVariants} className="grid md:grid-cols-2 gap-4">

              {/* Mood panel */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">😊 Mood (7 days)</h3>
                    <Link href="/mood" className="text-xs text-primary hover:underline">Details</Link>
                  </div>
                  {data?.mood.entryCount === 0 ? (
                    <p className="text-xs text-muted-foreground">No entries yet. Tell Ziggy how you&apos;re feeling!</p>
                  ) : (
                    <>
                      <div className="flex gap-4 mb-3">
                        <div>
                          <p className="text-2xl font-bold">{data?.mood.avgMood ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">Avg mood</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{data?.mood.avgEnergy ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">Avg energy</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{data?.mood.entryCount}</p>
                          <p className="text-xs text-muted-foreground">Entries</p>
                        </div>
                      </div>
                      {data?.mood.sparkline && <MoodSparkline data={data.mood.sparkline} />}
                      <p className="text-xs text-muted-foreground mt-1">Mon → Sun</p>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Finance panel */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">💰 Finance (7 days)</h3>
                    <Link href="/finance" className="text-xs text-primary hover:underline">Details</Link>
                  </div>
                  {data?.finance.transactionCount === 0 ? (
                    <p className="text-xs text-muted-foreground">No transactions yet. Tell Ziggy about your spending!</p>
                  ) : (
                    <>
                      <p className="text-2xl font-bold">₹{(data?.finance.weeklySpend ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                      <p className="text-xs text-muted-foreground mb-2">Total spent this week</p>
                      {data?.finance.topCategory && (
                        <div className="bg-muted/50 rounded-lg px-3 py-2 text-sm">
                          <span className="text-muted-foreground">Top: </span>
                          <span className="font-medium capitalize">{data.finance.topCategory.name}</span>
                          <span className="text-muted-foreground ml-1">₹{data.finance.topCategory.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.section>

            {/* People follow-ups */}
            {(data?.people.followUpCount ?? 0) > 0 && (
              <motion.section variants={itemVariants}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    👥 Follow-ups
                    {(data?.people.overdueCount ?? 0) > 0 && (
                      <span className="ml-2 text-destructive">({data!.people.overdueCount} overdue)</span>
                    )}
                  </h2>
                  <Link href="/people" className="text-xs text-primary hover:underline">View all</Link>
                </div>
                <Card>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border">
                      {data!.people.upcoming.map((f, i) => (
                        <Link key={i} href={`/people/${f.personId}`} className="flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${f.overdue ? "bg-destructive" : "bg-yellow-400"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{f.personName}</p>
                            <p className="text-xs text-muted-foreground truncate">{f.followUp}</p>
                          </div>
                          {f.dueDate && (
                            <span className={`text-xs shrink-0 ${f.overdue ? "text-destructive" : "text-muted-foreground"}`}>
                              {new Date(f.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.section>
            )}

            {/* Media: currently watching/reading */}
            {(data?.media.inProgress.length ?? 0) > 0 && (
              <motion.section variants={itemVariants}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">🎬 Currently</h2>
                  <Link href="/media" className="text-xs text-primary hover:underline">View all</Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {data!.media.inProgress.map((item) => (
                    <Card key={item.id} className="hover:shadow-md transition-all">
                      <CardContent className="p-3 text-center">
                        <p className="text-2xl mb-1">{TYPE_ICONS[item.type] ?? "🎬"}</p>
                        <p className="text-xs font-medium line-clamp-2">{item.title}</p>
                        {item.rating && <p className="text-xs text-yellow-400 mt-1">{"★".repeat(item.rating)}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Habits */}
            {data?.habits.streaks && data.habits.streaks.length > 0 && (
              <motion.section variants={itemVariants}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Habits</h2>
                  <Link href="/habits" className="text-xs text-primary hover:underline">View all</Link>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {data.habits.streaks.slice(0, 4).map((habit) => (
                    <Card key={habit.id}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${habit.completedToday ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
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

            {/* Recent Milestones */}
            {data?.landmarks && data.landmarks.length > 0 && (
              <motion.section variants={itemVariants}>
                <h2 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Milestones</h2>
                <Card>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border">
                      {data.landmarks.slice(0, 3).map((lm) => (
                        <div key={lm.id} className="p-3 flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-accent/20 to-accent/40 rounded-full flex items-center justify-center shrink-0">🏆</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{lm.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(lm.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.section>
            )}

            {/* Weekly Summary */}
            {data?.weeklySummary && (
              <motion.section variants={itemVariants}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">📊 Last Weekly Review</h2>
                  <span className="text-xs text-muted-foreground">
                    Week of {new Date(data.weeklySummary.weekStart).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                  </span>
                </div>
                <Card>
                  <CardContent className="p-4 text-sm prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: data.weeklySummary.report }} />
                </Card>
              </motion.section>
            )}

            {/* Empty state */}
            {isEmpty && (
              <motion.div variants={itemVariants} className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-white font-bold text-3xl">Z</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Welcome to Ziggy!</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">Start chatting to add tasks, habits, track mood, finances, and more.</p>
                <Link href="/"><Button size="lg">Start Chatting</Button></Link>
              </motion.div>
            )}

          </motion.div>
        </main>
      </div>
    </AppShell>
  );
}

function StatCard({ value, label, icon }: { value: string | number; label: string; icon: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <span className="text-2xl">{icon}</span>
        <p className="text-2xl font-bold mt-1">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
