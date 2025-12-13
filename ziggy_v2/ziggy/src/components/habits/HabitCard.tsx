"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { HabitContributionGraph } from "./HabitContributionGraph";

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

interface HabitCardProps {
  habit: Habit;
  onToggleToday: (habitId: string, completed: boolean) => void;
  onDelete: (habitId: string) => void;
}

export function HabitCard({ habit, onToggleToday, onDelete }: HabitCardProps) {
  const [showGraph, setShowGraph] = useState(false);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isCompletedToday = habit.records.some((r) => {
    const recordDate = new Date(r.date);
    recordDate.setHours(0, 0, 0, 0);
    return recordDate.getTime() === today.getTime() && r.completed;
  });

  // Calculate streak
  const calculateStreak = () => {
    const sortedRecords = [...habit.records]
      .filter((r) => r.completed)
      .map((r) => {
        const d = new Date(r.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
      .sort((a, b) => b - a);

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // If not completed today, start checking from yesterday
    if (!isCompletedToday) {
      currentDate.setDate(currentDate.getDate() - 1);
    }

    for (let i = 0; i < 365; i++) {
      if (sortedRecords.includes(currentDate.getTime())) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  };

  const streak = calculateStreak();

  // Get last 7 days for the week view
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      days.push(date);
    }
    return days;
  };

  const last7Days = getLast7Days();

  const isDateCompleted = (date: Date) => {
    return habit.records.some((r) => {
      const recordDate = new Date(r.date);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate.getTime() === date.getTime() && r.completed;
    });
  };

  return (
    <Card className="group">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-medium">{habit.name}</CardTitle>
            <p className="text-sm text-muted-foreground capitalize">
              {habit.frequency}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {streak > 0 && (
              <div className="flex items-center gap-1 text-orange-500">
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
                <span className="text-sm font-semibold">{streak}</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(habit.id)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-4 h-4"
              >
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Week view */}
        <div className="flex justify-between">
          {last7Days.map((date, i) => {
            const isCompleted = isDateCompleted(date);
            const isToday = date.getTime() === today.getTime();
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  {date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1)}
                </span>
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                    isCompleted
                      ? "bg-green-500 text-white"
                      : isToday
                      ? "bg-primary/10 text-primary border-2 border-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>

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
          
          {showGraph && (
            <div className="mt-3 pt-3 border-t border-border">
              <HabitContributionGraph records={habit.records} weeks={12} />
            </div>
          )}
        </div>

        {/* Today's toggle */}
        <Button
          onClick={() => onToggleToday(habit.id, !isCompletedToday)}
          variant={isCompletedToday ? "outline" : "default"}
          className="w-full"
        >
          {isCompletedToday ? (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5 mr-2 text-green-500"
              >
                <path
                  fillRule="evenodd"
                  d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                  clipRule="evenodd"
                />
              </svg>
              Done today
            </>
          ) : (
            <>Mark as done</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

