"use client";

import { cn } from "@/lib/utils";

interface HabitRecord {
  id: string;
  date: Date;
  completed: boolean;
}

interface HabitContributionGraphProps {
  records: HabitRecord[];
  weeks?: number; // Number of weeks to show (default 12)
}

export function HabitContributionGraph({
  records,
  weeks = 12,
}: HabitContributionGraphProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Create a set of completed dates for quick lookup
  const completedDates = new Set(
    records
      .filter((r) => r.completed)
      .map((r) => {
        const d = new Date(r.date);
        d.setHours(0, 0, 0, 0);
        return d.toISOString().split("T")[0];
      })
  );

  // Generate grid data (weeks x 7 days)
  const generateGrid = () => {
    const grid: { date: Date; completed: boolean; future: boolean }[][] = [];
    
    // Start from the Sunday of the current week
    const startOfThisWeek = new Date(today);
    startOfThisWeek.setDate(today.getDate() - today.getDay());
    
    // Go back to get the full number of weeks
    const startDate = new Date(startOfThisWeek);
    startDate.setDate(startDate.getDate() - (weeks - 1) * 7);

    for (let week = 0; week < weeks; week++) {
      const weekData: { date: Date; completed: boolean; future: boolean }[] = [];
      
      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + week * 7 + day);
        currentDate.setHours(0, 0, 0, 0);

        const dateStr = currentDate.toISOString().split("T")[0];
        const isFuture = currentDate > today;
        
        weekData.push({
          date: currentDate,
          completed: completedDates.has(dateStr),
          future: isFuture,
        });
      }
      
      grid.push(weekData);
    }

    return grid;
  };

  const grid = generateGrid();

  // Calculate stats
  const totalDays = weeks * 7;
  const completedCount = grid.flat().filter((d) => d.completed && !d.future).length;
  const availableDays = grid.flat().filter((d) => !d.future).length;
  const completionRate = availableDays > 0 ? Math.round((completedCount / availableDays) * 100) : 0;

  // Month labels
  const getMonthLabels = () => {
    const labels: { month: string; week: number }[] = [];
    let lastMonth = -1;

    grid.forEach((week, weekIndex) => {
      const firstDayOfWeek = week[0].date;
      const month = firstDayOfWeek.getMonth();
      
      if (month !== lastMonth) {
        labels.push({
          month: firstDayOfWeek.toLocaleDateString("en-US", { month: "short" }),
          week: weekIndex,
        });
        lastMonth = month;
      }
    });

    return labels;
  };

  const monthLabels = getMonthLabels();

  return (
    <div className="space-y-2">
      {/* Month labels */}
      <div className="flex text-xs text-muted-foreground ml-6">
        {monthLabels.map((label, i) => (
          <div
            key={i}
            className="flex-shrink-0"
            style={{
              marginLeft: i === 0 ? 0 : `${(label.week - (monthLabels[i - 1]?.week || 0) - 1) * 12}px`,
            }}
          >
            {label.month}
          </div>
        ))}
      </div>

      {/* Grid with day labels */}
      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-[2px] text-[10px] text-muted-foreground pr-1">
          <span className="h-[10px]"></span>
          <span className="h-[10px] leading-[10px]">M</span>
          <span className="h-[10px]"></span>
          <span className="h-[10px] leading-[10px]">W</span>
          <span className="h-[10px]"></span>
          <span className="h-[10px] leading-[10px]">F</span>
          <span className="h-[10px]"></span>
        </div>

        {/* Contribution grid */}
        <div className="flex gap-[2px]">
          {grid.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-[2px]">
              {week.map((day, dayIndex) => {
                const isToday = day.date.getTime() === today.getTime();
                
                return (
                  <div
                    key={dayIndex}
                    title={
                      day.future
                        ? ""
                        : `${day.date.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}: ${day.completed ? "Completed" : "Not completed"}`
                    }
                    className={cn(
                      "w-[10px] h-[10px] rounded-[2px] transition-colors",
                      day.future
                        ? "bg-transparent"
                        : day.completed
                        ? "bg-green-500"
                        : "bg-muted",
                      isToday && "ring-1 ring-primary ring-offset-1 ring-offset-background"
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
        <div className="flex items-center gap-2">
          <span>Less</span>
          <div className="flex gap-[2px]">
            <div className="w-[10px] h-[10px] rounded-[2px] bg-muted" />
            <div className="w-[10px] h-[10px] rounded-[2px] bg-green-300" />
            <div className="w-[10px] h-[10px] rounded-[2px] bg-green-500" />
          </div>
          <span>More</span>
        </div>
        <span>
          {completedCount} / {availableDays} days ({completionRate}%)
        </span>
      </div>
    </div>
  );
}

