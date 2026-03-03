"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FrequencyType, getDayLabel } from "@/lib/habits";

interface AddHabitProps {
  onAdd: (habit: {
    name: string;
    frequencyType: FrequencyType;
    frequencyDays?: number[];
    frequencyTarget?: number;
  }) => void;
}

const FREQUENCY_OPTIONS: { value: FrequencyType; label: string; description: string }[] = [
  { value: "every_day", label: "Every day", description: "Complete this daily" },
  { value: "specific_days", label: "Specific days", description: "Choose which days" },
  { value: "times_per_week", label: "Times per week", description: "Hit a weekly target" },
  { value: "times_per_month", label: "Times per month", description: "Hit a monthly target" },
];

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun display order

const QUICK_DAY_PRESETS = [
  { label: "Weekdays", days: [1, 2, 3, 4, 5] },
  { label: "Weekends", days: [0, 6] },
  { label: "MWF", days: [1, 3, 5] },
  { label: "TTS", days: [2, 4, 6] },
];

export function AddHabit({ onAdd }: AddHabitProps) {
  const [name, setName] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [frequencyType, setFrequencyType] = useState<FrequencyType>("every_day");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]); // Default: MWF
  const [target, setTarget] = useState(3);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd({
      name: name.trim(),
      frequencyType,
      frequencyDays: frequencyType === "specific_days" ? selectedDays : undefined,
      frequencyTarget:
        frequencyType === "times_per_week" || frequencyType === "times_per_month"
          ? target
          : undefined,
    });

    // Reset
    setName("");
    setIsExpanded(false);
    setFrequencyType("every_day");
    setSelectedDays([1, 3, 5]);
    setTarget(3);
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={() => setIsExpanded(true)}
          placeholder="Add a new habit..."
          className="flex-1"
        />
        <Button type="submit" disabled={!name.trim()}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-4 h-4 mr-2"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add
        </Button>
      </div>

      <AnimatePresence>
        {isExpanded && name.trim() && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-card rounded-xl border p-4 space-y-4">
              {/* Frequency type selector */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  How often?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFrequencyType(opt.value)}
                      className={cn(
                        "text-left p-2.5 rounded-lg border transition-all text-sm",
                        frequencyType === opt.value
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/30"
                      )}
                    >
                      <span className="font-medium block">{opt.label}</span>
                      <span className="text-xs opacity-70">{opt.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Specific days picker */}
              <AnimatePresence>
                {frequencyType === "specific_days" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-3"
                  >
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        Which days?
                      </label>
                      <div className="flex gap-1.5">
                        {ALL_DAYS.map((day) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDay(day)}
                            className={cn(
                              "w-9 h-9 rounded-full text-sm font-medium transition-all",
                              selectedDays.includes(day)
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            )}
                          >
                            {getDayLabel(day)}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-1.5 mt-2">
                        {QUICK_DAY_PRESETS.map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => setSelectedDays(preset.days)}
                            className={cn(
                              "text-xs px-2.5 py-1 rounded-full border transition-all",
                              JSON.stringify([...selectedDays].sort()) === JSON.stringify([...preset.days].sort())
                                ? "border-primary/50 bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Target picker for times_per_week / times_per_month */}
              <AnimatePresence>
                {(frequencyType === "times_per_week" || frequencyType === "times_per_month") && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Target: {target}x per {frequencyType === "times_per_week" ? "week" : "month"}
                    </label>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setTarget(Math.max(1, target - 1))}
                        disabled={target <= 1}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M5 12h14" /></svg>
                      </Button>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{
                            width: `${(target / (frequencyType === "times_per_week" ? 7 : 30)) * 100}%`,
                          }}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setTarget(Math.min(frequencyType === "times_per_week" ? 7 : 30, target + 1))}
                        disabled={target >= (frequencyType === "times_per_week" ? 7 : 30)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M12 5v14M5 12h14" /></svg>
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Your streak won&apos;t break as long as you hit {target} completions
                      {frequencyType === "times_per_week" ? " each week" : " each month"}.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Collapse button */}
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Collapse
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
