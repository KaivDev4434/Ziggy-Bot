"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { HabitContributionGraph } from "./HabitContributionGraph";
import {
  type FrequencyType,
  type HabitConfig,
  calculateStreak,
  getMilestoneInfo,
  getMilestoneLabel,
  getFrequencyLabel,
  getCurrentPeriodProgress,
  isHabitDueOnDate,
  getDayLabel,
} from "@/lib/habits";

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

interface HabitCardProps {
  habit: Habit;
  onToggleToday: (habitId: string, completed: boolean) => void;
  onDelete: (habitId: string) => void;
  onEdit?: (habitId: string, updates: Record<string, unknown>) => void;
}

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun display order

function parseFrequencyDays(raw: string | null | undefined): number[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function HabitCard({ habit, onToggleToday, onDelete, onEdit }: HabitCardProps) {
  const [showGraph, setShowGraph] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(habit.name);
  const [editFreqType, setEditFreqType] = useState<FrequencyType>(
    (habit.frequencyType as FrequencyType) || "every_day"
  );
  const [editDays, setEditDays] = useState<number[]>(
    parseFrequencyDays(habit.frequencyDays)
  );
  const [editTarget, setEditTarget] = useState(habit.frequencyTarget ?? 3);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const config: HabitConfig = useMemo(
    () => ({
      frequencyType: (habit.frequencyType as FrequencyType) || "every_day",
      frequencyDays: parseFrequencyDays(habit.frequencyDays),
      frequencyTarget: habit.frequencyTarget,
    }),
    [habit.frequencyType, habit.frequencyDays, habit.frequencyTarget]
  );

  const isCompletedToday = habit.records.some((r) => {
    const recordDate = new Date(r.date);
    recordDate.setHours(0, 0, 0, 0);
    return recordDate.getTime() === today.getTime() && r.completed;
  });

  const isDueToday = isHabitDueOnDate(config, today);

  const streak = useMemo(() => calculateStreak(config, habit.records), [config, habit.records]);
  const milestoneInfo = useMemo(
    () => getMilestoneInfo(streak, habit.bestStreak ?? 0),
    [streak, habit.bestStreak]
  );
  const periodProgress = useMemo(
    () => getCurrentPeriodProgress(config, habit.records),
    [config, habit.records]
  );
  const frequencyLabel = useMemo(() => getFrequencyLabel(config), [config]);

  // Get last 7 days for the week view
  const last7Days = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      days.push(date);
    }
    return days;
  }, []);

  const isDateCompleted = (date: Date) => {
    return habit.records.some((r) => {
      const recordDate = new Date(r.date);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate.getTime() === date.getTime() && r.completed;
    });
  };

  const handleSaveEdit = () => {
    if (!onEdit || !editName.trim()) return;
    onEdit(habit.id, {
      name: editName.trim(),
      frequencyType: editFreqType,
      frequencyDays: editFreqType === "specific_days" ? editDays : null,
      frequencyTarget:
        editFreqType === "times_per_week" || editFreqType === "times_per_month"
          ? editTarget
          : null,
    });
    toast.success("Habit updated");
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(habit.name);
    setEditFreqType((habit.frequencyType as FrequencyType) || "every_day");
    setEditDays(parseFrequencyDays(habit.frequencyDays));
    setEditTarget(habit.frequencyTarget ?? 3);
    setIsEditing(false);
  };

  // Update best streak via API when it's a new record
  const bestStreakUpdated = useRef(false);
  useEffect(() => {
    if (milestoneInfo.isNewBest && onEdit && !bestStreakUpdated.current) {
      bestStreakUpdated.current = true;
      onEdit(habit.id, { bestStreak: milestoneInfo.bestStreak });
    }
  }, [milestoneInfo.isNewBest, milestoneInfo.bestStreak, habit.id, onEdit]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="group">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-3">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Habit name"
                    className="text-base font-medium"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit();
                      if (e.key === "Escape") handleCancelEdit();
                    }}
                  />

                  {/* Frequency type */}
                  <div className="flex gap-1.5 flex-wrap">
                    {(["every_day", "specific_days", "times_per_week", "times_per_month"] as FrequencyType[]).map(
                      (ft) => (
                        <button
                          key={ft}
                          type="button"
                          onClick={() => setEditFreqType(ft)}
                          className={cn(
                            "text-xs px-2.5 py-1 rounded-full border transition-all",
                            editFreqType === ft
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {ft === "every_day" && "Daily"}
                          {ft === "specific_days" && "Specific days"}
                          {ft === "times_per_week" && "x/week"}
                          {ft === "times_per_month" && "x/month"}
                        </button>
                      )
                    )}
                  </div>

                  {/* Specific days picker */}
                  {editFreqType === "specific_days" && (
                    <div className="flex gap-1">
                      {ALL_DAYS.map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() =>
                            setEditDays((prev) =>
                              prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
                            )
                          }
                          className={cn(
                            "w-7 h-7 rounded-full text-xs font-medium transition-all",
                            editDays.includes(day)
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {getDayLabel(day)}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Target picker */}
                  {(editFreqType === "times_per_week" || editFreqType === "times_per_month") && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Target:</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setEditTarget(Math.max(1, editTarget - 1))}
                      >
                        <span className="text-xs">-</span>
                      </Button>
                      <span className="text-sm font-medium w-6 text-center">{editTarget}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() =>
                          setEditTarget(
                            Math.min(editFreqType === "times_per_week" ? 7 : 30, editTarget + 1)
                          )
                        }
                      >
                        <span className="text-xs">+</span>
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        per {editFreqType === "times_per_week" ? "week" : "month"}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-1.5">
                    <Button size="sm" className="h-7 text-xs" onClick={handleSaveEdit}>
                      Save
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <CardTitle className="text-lg font-medium">{habit.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{frequencyLabel}</p>
                </>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0 ml-2">
              {streak > 0 && !isEditing && (
                <div className="flex items-center gap-1 text-warning mr-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.963 2.286a.75.75 0 00-1.071-.136 9.742 9.742 0 00-3.539 6.177A7.547 7.547 0 016.648 6.61a.75.75 0 00-1.152.082A9 9 0 1015.68 4.534a7.46 7.46 0 01-2.717-2.248zM15.75 14.25a3.75 3.75 0 11-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 011.925-3.545 3.75 3.75 0 013.255 3.717z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-semibold">
                    {streak}
                    {config.frequencyType === "times_per_week" && "w"}
                    {config.frequencyType === "times_per_month" && "m"}
                  </span>
                </div>
              )}
              {!isEditing && onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                  onClick={() => setIsEditing(true)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(habit.id)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Period progress for times_per_week / times_per_month */}
          {periodProgress && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {periodProgress.completed}/{periodProgress.target} {periodProgress.label}
                </span>
                {periodProgress.completed >= periodProgress.target && (
                  <span className="text-success font-medium">Target met!</span>
                )}
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    periodProgress.completed >= periodProgress.target ? "bg-success" : "bg-primary"
                  )}
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(100, (periodProgress.completed / periodProgress.target) * 100)}%`,
                  }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
          )}

          {/* Week view */}
          <div className="flex justify-between">
            {last7Days.map((date, i) => {
              const isCompleted = isDateCompleted(date);
              const isToday = date.getTime() === today.getTime();
              const isDue = isHabitDueOnDate(config, date);
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className="text-xs text-muted-foreground">
                    {date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1)}
                  </span>
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                      isCompleted
                        ? "bg-success text-success-foreground"
                        : isToday
                        ? "bg-primary/10 text-primary border-2 border-primary"
                        : !isDue
                        ? "bg-muted/50 text-muted-foreground/40"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Milestone progress */}
          {milestoneInfo.nextMilestone && streak > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Next: {getMilestoneLabel(milestoneInfo.nextMilestone)}
                </span>
                <span className="text-muted-foreground font-medium">
                  {streak}/{milestoneInfo.nextMilestone}
                </span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-warning/70 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${milestoneInfo.progressToNext * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              {milestoneInfo.bestStreak > 0 && milestoneInfo.bestStreak > streak && (
                <p className="text-[11px] text-muted-foreground">
                  Personal best: {milestoneInfo.bestStreak}
                  {config.frequencyType === "times_per_week" ? " weeks" : config.frequencyType === "times_per_month" ? " months" : " days"}
                </p>
              )}
            </div>
          )}

          {/* Reached milestones badges */}
          {milestoneInfo.reachedMilestones.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {milestoneInfo.reachedMilestones.map((m) => (
                <span
                  key={m}
                  className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5">
                    <path fillRule="evenodd" d="M5.166 2.621v.858c-1.035.148-2.059.33-3.071.543a.75.75 0 00-.584.859 6.753 6.753 0 006.138 5.6 6.73 6.73 0 002.743 1.346A6.707 6.707 0 019.279 15H8.54c-1.036 0-1.875.84-1.875 1.875V19.5h-.375a.75.75 0 000 1.5h12.375a.75.75 0 100-1.5h-.374v-2.625c0-1.036-.84-1.875-1.876-1.875h-.739a6.707 6.707 0 01-1.112-3.173 6.73 6.73 0 002.743-1.347 6.753 6.753 0 006.139-5.6.75.75 0 00-.585-.858 47.077 47.077 0 00-3.07-.543V2.62a.75.75 0 00-.658-.744 49.22 49.22 0 00-6.093-.377c-2.063 0-4.096.128-6.093.377a.75.75 0 00-.657.744z" clipRule="evenodd" />
                  </svg>
                  {getMilestoneLabel(m)}
                </span>
              ))}
            </div>
          )}

          {/* Expandable contribution graph */}
          <div>
            <button
              onClick={() => setShowGraph(!showGraph)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-1"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={cn("w-3 h-3 transition-transform", showGraph && "rotate-180")}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
              {showGraph ? "Hide" : "Show"} progress graph
            </button>

            <AnimatePresence>
              {showGraph && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 pt-3 border-t border-border">
                    <HabitContributionGraph records={habit.records} weeks={12} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Today's toggle */}
          <Button
            onClick={() => onToggleToday(habit.id, !isCompletedToday)}
            variant={isCompletedToday ? "outline" : "default"}
            className={cn("w-full", !isDueToday && !isCompletedToday && "opacity-60")}
          >
            {isCompletedToday ? (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5 mr-2 text-success"
                >
                  <path
                    fillRule="evenodd"
                    d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                    clipRule="evenodd"
                  />
                </svg>
                Done today
              </>
            ) : isDueToday ? (
              "Mark as done"
            ) : (
              "Mark as done (bonus)"
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
