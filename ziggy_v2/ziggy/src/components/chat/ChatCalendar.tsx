"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  messageDates: string[]; // Array of dates that have messages (YYYY-MM-DD format)
}

export function ChatCalendar({
  selectedDate,
  onSelectDate,
  messageDates,
}: ChatCalendarProps) {
  const [viewDate, setViewDate] = useState(new Date(selectedDate));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysInMonth = new Date(
    viewDate.getFullYear(),
    viewDate.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    viewDate.getFullYear(),
    viewDate.getMonth(),
    1
  ).getDay();

  const monthName = viewDate.toLocaleString("default", { month: "long" });
  const year = viewDate.getFullYear();

  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    if (next <= today) {
      setViewDate(next);
    }
  };

  const goToToday = () => {
    const now = new Date();
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    now.setHours(0, 0, 0, 0);
    onSelectDate(now);
  };

  const isSelected = (day: number) => {
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    date.setHours(0, 0, 0, 0);
    const sel = new Date(selectedDate);
    sel.setHours(0, 0, 0, 0);
    return date.getTime() === sel.getTime();
  };

  const isToday = (day: number) => {
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    date.setHours(0, 0, 0, 0);
    return date.getTime() === today.getTime();
  };

  const hasMessages = (day: number) => {
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const dateStr = date.toISOString().split("T")[0];
    return messageDates.includes(dateStr);
  };

  const isFuture = (day: number) => {
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    date.setHours(0, 0, 0, 0);
    return date > today;
  };

  const handleDayClick = (day: number) => {
    if (!isFuture(day)) {
      const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
      date.setHours(0, 0, 0, 0);
      onSelectDate(date);
    }
  };

  const canGoNext =
    new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1) <= today;

  const days = [];
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
  }
  // Add cells for each day
  for (let day = 1; day <= daysInMonth; day++) {
    const future = isFuture(day);
    days.push(
      <button
        key={day}
        onClick={() => handleDayClick(day)}
        disabled={future}
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-sm relative transition-colors",
          isSelected(day)
            ? "bg-primary text-primary-foreground font-semibold"
            : isToday(day)
            ? "bg-primary/10 text-primary font-medium"
            : future
            ? "text-muted-foreground/30 cursor-not-allowed"
            : "hover:bg-muted text-foreground"
        )}
      >
        {day}
        {hasMessages(day) && !isSelected(day) && (
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
        )}
      </button>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-4 h-4"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Button>
        <div className="text-center">
          <button
            onClick={goToToday}
            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            {monthName} {year}
          </button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={nextMonth}
          disabled={!canGoNext}
          className="h-8 w-8"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-4 h-4"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div
            key={i}
            className="w-8 h-6 flex items-center justify-center text-xs text-muted-foreground font-medium"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">{days}</div>

      {/* Today button */}
      {selectedDate.getTime() !== today.getTime() && (
        <Button
          variant="outline"
          size="sm"
          onClick={goToToday}
          className="w-full mt-4 text-xs"
        >
          Go to Today
        </Button>
      )}
    </div>
  );
}

