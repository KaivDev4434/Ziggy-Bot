// Daily Briefing Generator

interface Todo {
  id: string;
  title: string;
  category: string | null;
  priority: number | null;
  dueDate: Date | null;
  doDate: Date | null;
  status: string;
}

interface WeatherData {
  temperature: number;
  description: string;
  icon: string;
  location?: string;
}

export interface BriefingData {
  weather?: WeatherData;
  todaysTodos: Todo[];
  upcomingDeadlines: { todo: Todo; daysLeft: number }[];
  habits: { name: string; streak: number; completedToday: boolean }[];
  greeting: string;
}

export interface BriefingOptions {
  lat?: number;
  lon?: number;
  forceRegenerate?: boolean;
}

// Get greeting based on time of day
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// Get day of week name
function getDayName(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long" });
}

// Get formatted date
function getFormattedDate(): string {
  return new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Fetch weather data with optional coordinates
async function fetchWeather(lat?: number, lon?: number): Promise<WeatherData | undefined> {
  try {
    // Build URL with coordinates if available
    let url = "https://wttr.in/";
    if (lat !== undefined && lon !== undefined) {
      url += `${lat},${lon}`;
    }
    url += "?format=j1";

    const response = await fetch(url, {
      headers: { "User-Agent": "Ziggy/1.0" },
    });

    if (!response.ok) return undefined;

    const data = await response.json();
    const current = data.current_condition?.[0];
    const area = data.nearest_area?.[0];

    if (!current) return undefined;

    // Get location name
    let location = "";
    if (area) {
      const city = area.areaName?.[0]?.value || "";
      const country = area.country?.[0]?.value || "";
      location = city ? `${city}${country ? `, ${country}` : ""}` : "";
    }

    return {
      temperature: parseInt(current.temp_C || current.temp_F),
      description: current.weatherDesc?.[0]?.value || "Unknown",
      icon: getWeatherEmoji(current.weatherCode),
      location,
    };
  } catch (error) {
    console.error("Failed to fetch weather:", error);
    return undefined;
  }
}

function getWeatherEmoji(code: string): string {
  const codeNum = parseInt(code);
  if (codeNum === 113) return "☀️"; // Sunny
  if (codeNum === 116) return "⛅"; // Partly cloudy
  if (codeNum === 119 || codeNum === 122) return "☁️"; // Cloudy
  if ([176, 263, 266, 293, 296, 299, 302, 305, 308, 311, 314, 353, 356, 359].includes(codeNum))
    return "🌧️"; // Rain
  if ([179, 182, 185, 227, 230, 320, 323, 326, 329, 332, 335, 338, 350, 362, 365, 368, 371, 374, 377].includes(codeNum))
    return "🌨️"; // Snow
  if ([200, 386, 389, 392, 395].includes(codeNum)) return "⛈️"; // Thunderstorm
  if ([248, 260].includes(codeNum)) return "🌫️"; // Fog
  return "🌤️";
}

// Helper to compare dates ignoring time (using local dates)
function isSameLocalDay(date1: Date, date2: Date): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

// Calculate days between two dates (local)
function daysBetween(from: Date, to: Date): number {
  const fromLocal = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const toLocal = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.ceil((toLocal.getTime() - fromLocal.getTime()) / (24 * 60 * 60 * 1000));
}

export async function generateBriefing(
  todos: Todo[],
  habits: { name: string; records: { date: Date; completed: boolean }[] }[],
  options: BriefingOptions = {}
): Promise<string> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch weather with location if available
  const weather = await fetchWeather(options.lat, options.lon);

  // Get today's todos (by doDate or dueDate)
  const todaysTodos = todos.filter((t) => {
    if (t.status === "done") return false;

    if (t.doDate && isSameLocalDay(new Date(t.doDate), today)) {
      return true;
    }

    if (t.dueDate && isSameLocalDay(new Date(t.dueDate), today)) {
      return true;
    }

    return false;
  });

  // Get upcoming deadlines (this week, excluding today)
  const upcomingDeadlines = todos
    .filter((t) => {
      if (t.status === "done" || !t.dueDate) return false;
      const daysLeft = daysBetween(today, new Date(t.dueDate));
      return daysLeft > 0 && daysLeft <= 7;
    })
    .map((t) => ({
      todo: t,
      daysLeft: daysBetween(today, new Date(t.dueDate!)),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // Calculate habit streaks
  const habitStats = habits.map((h) => {
    const todayRecord = h.records.find((r) => isSameLocalDay(new Date(r.date), today));

    // Calculate streak
    let streak = 0;
    const sortedDates = h.records
      .filter((r) => r.completed)
      .map((r) => {
        const d = new Date(r.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
      .sort((a, b) => b - a);

    const checkDate = new Date(today);
    if (!todayRecord?.completed) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    checkDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      if (sortedDates.includes(checkDate.getTime())) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      name: h.name,
      streak,
      completedToday: !!todayRecord?.completed,
    };
  });

  // Build briefing message
  const parts: string[] = [];

  // Greeting with date
  parts.push(`${getGreeting()}! Happy ${getDayName()}! 👋`);
  parts.push(`*${getFormattedDate()}*`);

  // Weather
  if (weather) {
    const locationText = weather.location ? ` in ${weather.location}` : "";
    parts.push(
      `\n${weather.icon} It's currently ${weather.temperature}°C and ${weather.description.toLowerCase()}${locationText}.`
    );
  }

  // Today's focus
  if (todaysTodos.length > 0) {
    parts.push("\n\n**Today's Focus:**");

    // Group by category
    const byCategory: Record<string, Todo[]> = {};
    todaysTodos.forEach((t) => {
      const cat = t.category || "general";
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(t);
    });

    Object.entries(byCategory).forEach(([cat, catTodos]) => {
      if (Object.keys(byCategory).length > 1) {
        parts.push(`\n*${cat.charAt(0).toUpperCase() + cat.slice(1)}:*`);
      }
      catTodos.forEach((t) => {
        const priority = t.priority === 1 ? " 🔴" : t.priority === 3 ? " 🟢" : "";
        parts.push(`- ${t.title}${priority}`);
      });
    });
  } else {
    parts.push("\n\nNo specific tasks scheduled for today. A great day to get ahead!");
  }

  // Upcoming deadlines
  if (upcomingDeadlines.length > 0) {
    parts.push("\n\n**Coming Up This Week:**");
    upcomingDeadlines.slice(0, 5).forEach(({ todo, daysLeft }) => {
      const dayWord = daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`;
      parts.push(`- ${todo.title} (due ${dayWord})`);
    });
  }

  // Habits to focus on
  const incompleteHabits = habitStats.filter((h) => !h.completedToday);
  if (incompleteHabits.length > 0) {
    parts.push("\n\n**Habits for Today:**");
    incompleteHabits.forEach((h) => {
      const streakText = h.streak > 0 ? ` (${h.streak} day streak!)` : "";
      parts.push(`- ${h.name}${streakText}`);
    });
  }

  // Motivation
  const pendingCount = todos.filter((t) => t.status === "pending").length;
  if (pendingCount > 0) {
    parts.push(`\n\nYou have ${pendingCount} total pending task${pendingCount > 1 ? "s" : ""}. Let's make today count! 💪`);
  } else {
    parts.push("\n\nYour task list is clear - what would you like to work on today?");
  }

  return parts.join("\n");
}
