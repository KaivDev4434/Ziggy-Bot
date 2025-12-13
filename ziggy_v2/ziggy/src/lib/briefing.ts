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

interface Habit {
  name: string;
  streak: number;
  completedToday: boolean;
}

interface WeatherData {
  temperature: number;
  description: string;
  icon: string;
}

export interface BriefingData {
  weather?: WeatherData;
  todaysTodos: Todo[];
  upcomingDeadlines: { todo: Todo; daysLeft: number }[];
  habits: Habit[];
  greeting: string;
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

// Fetch weather data (using a free API)
async function fetchWeather(): Promise<WeatherData | undefined> {
  try {
    // Using wttr.in for simple weather data (no API key needed)
    const response = await fetch("https://wttr.in/?format=j1", {
      headers: { "User-Agent": "Ziggy/1.0" },
    });

    if (!response.ok) return undefined;

    const data = await response.json();
    const current = data.current_condition?.[0];

    if (!current) return undefined;

    return {
      temperature: parseInt(current.temp_C || current.temp_F),
      description: current.weatherDesc?.[0]?.value || "Unknown",
      icon: getWeatherEmoji(current.weatherCode),
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

export async function generateBriefing(
  todos: Todo[],
  habits: { name: string; records: { date: Date; completed: boolean }[] }[]
): Promise<string> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const oneWeekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Fetch weather
  const weather = await fetchWeather();

  // Get today's todos (by doDate or dueDate)
  const todaysTodos = todos.filter((t) => {
    if (t.status === "done") return false;
    
    if (t.doDate) {
      const doDate = new Date(t.doDate);
      doDate.setHours(0, 0, 0, 0);
      if (doDate.getTime() === today.getTime()) return true;
    }
    
    if (t.dueDate) {
      const dueDate = new Date(t.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      if (dueDate.getTime() === today.getTime()) return true;
    }
    
    return false;
  });

  // Get upcoming deadlines (this week, excluding today)
  const upcomingDeadlines = todos
    .filter((t) => {
      if (t.status === "done" || !t.dueDate) return false;
      const dueDate = new Date(t.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate > today && dueDate <= oneWeekFromNow;
    })
    .map((t) => ({
      todo: t,
      daysLeft: Math.ceil(
        (new Date(t.dueDate!).getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
      ),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // Calculate habit streaks
  const habitStats = habits.map((h) => {
    const todayRecord = h.records.find((r) => {
      const recordDate = new Date(r.date);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate.getTime() === today.getTime();
    });

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

    let checkDate = new Date(today);
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

  // Greeting
  parts.push(`${getGreeting()}! Happy ${getDayName()}! 👋`);

  // Weather
  if (weather) {
    parts.push(
      `\n${weather.icon} It's currently ${weather.temperature}°C and ${weather.description.toLowerCase()}.`
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

