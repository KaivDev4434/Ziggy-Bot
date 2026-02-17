"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChatInterface } from "@/components/chat";
import { ChatCalendar } from "@/components/chat/ChatCalendar";
import { AppShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getEffectiveDate, isLateNightMode, toLocalDateString, isSameDay } from "@/lib/utils";
import { getLocation, LocationInfo } from "@/lib/location";

interface Message {
  id: string;
  role: string;
  content: string;
  date: Date;
  createdAt: Date;
}

// Session storage keys
const STORAGE_KEYS = {
  SELECTED_DATE: "ziggy_selected_date",
  MESSAGES_CACHE: "ziggy_messages_cache",
  MESSAGE_DATES: "ziggy_message_dates",
  LAST_FETCHED_DATE: "ziggy_last_fetched_date",
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageDates, setMessageDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    return getEffectiveDate();
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [isLateNight, setIsLateNight] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const locationRef = useRef<LocationInfo | null>(null);

  // Check if viewing a past date (read-only mode)
  const today = getEffectiveDate();
  const isPastDate = !isSameDay(selectedDate, today);

  // Format date for display
  const formatDateDisplay = (date: Date) => {
    const effectiveToday = getEffectiveDate();

    if (isSameDay(date, effectiveToday)) {
      return isLateNight ? "Today (Late Night)" : "Today";
    }

    const yesterday = new Date(effectiveToday);
    yesterday.setDate(yesterday.getDate() - 1);
    if (isSameDay(date, yesterday)) {
      return "Yesterday";
    }

    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // Check late night mode
  useEffect(() => {
    const checkLateNight = () => {
      setIsLateNight(isLateNightMode());
    };
    checkLateNight();
    const interval = setInterval(checkLateNight, 60000);
    return () => clearInterval(interval);
  }, []);

  // Get location on mount
  useEffect(() => {
    const fetchLocation = async () => {
      const coords = await getLocation();
      if (coords) {
        locationRef.current = coords;
      }
    };
    fetchLocation();
  }, []);

  // Initialize from sessionStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      // Restore selected date
      const cachedDate = sessionStorage.getItem(STORAGE_KEYS.SELECTED_DATE);
      if (cachedDate) {
        const parsed = new Date(cachedDate);
        const effectiveToday = getEffectiveDate();
        if (parsed <= effectiveToday) {
          setSelectedDate(parsed);
        }
      }

      // Restore message dates
      const cachedDates = sessionStorage.getItem(STORAGE_KEYS.MESSAGE_DATES);
      if (cachedDates) {
        setMessageDates(JSON.parse(cachedDates));
      }

      // Restore messages cache
      const cachedMessages = sessionStorage.getItem(STORAGE_KEYS.MESSAGES_CACHE);
      const lastFetchedDate = sessionStorage.getItem(STORAGE_KEYS.LAST_FETCHED_DATE);
      const currentDateStr = toLocalDateString(selectedDate);

      if (cachedMessages && lastFetchedDate === currentDateStr) {
        const parsed = JSON.parse(cachedMessages);
        setMessages(parsed);
      }
    } catch (error) {
      console.error("Failed to restore cached state:", error);
    }

    setIsInitialized(true);
  }, []);

  // Save selected date to sessionStorage
  useEffect(() => {
    if (typeof window === "undefined" || !isInitialized) return;
    try {
      sessionStorage.setItem(STORAGE_KEYS.SELECTED_DATE, selectedDate.toISOString());
    } catch {}
  }, [selectedDate, isInitialized]);

  // Save message dates to sessionStorage
  useEffect(() => {
    if (typeof window === "undefined" || messageDates.length === 0 || !isInitialized) return;
    try {
      sessionStorage.setItem(STORAGE_KEYS.MESSAGE_DATES, JSON.stringify(messageDates));
    } catch {}
  }, [messageDates, isInitialized]);

  // Save messages to sessionStorage when they change
  useEffect(() => {
    if (typeof window === "undefined" || !isInitialized) return;
    try {
      const dateStr = toLocalDateString(selectedDate);
      sessionStorage.setItem(STORAGE_KEYS.MESSAGES_CACHE, JSON.stringify(messages));
      sessionStorage.setItem(STORAGE_KEYS.LAST_FETCHED_DATE, dateStr);
    } catch {}
  }, [messages, selectedDate, isInitialized]);

  // Fetch messages from API
  const fetchMessages = useCallback(async (force = false) => {
    const dateStr = toLocalDateString(selectedDate);

    // Skip if we have cached messages for this date and not forcing
    if (!force && messages.length > 0) {
      const lastFetched = sessionStorage.getItem(STORAGE_KEYS.LAST_FETCHED_DATE);
      if (lastFetched === dateStr) {
        return;
      }
    }

    try {
      const response = await fetch(`/api/messages?date=${dateStr}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
        setMessageDates(data.messageDates || []);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  }, [selectedDate, messages.length]);

  // Fetch messages when date changes or on initial load
  useEffect(() => {
    if (!isInitialized) return;

    const dateStr = toLocalDateString(selectedDate);
    const lastFetched = sessionStorage.getItem(STORAGE_KEYS.LAST_FETCHED_DATE);

    // Only fetch if date changed or no cached data
    if (lastFetched !== dateStr || messages.length === 0) {
      fetchMessages(true);
    }
  }, [selectedDate, isInitialized]);

  // Generate daily briefing
  const generateBriefing = useCallback(async (forceRegenerate = false) => {
    if (isPastDate) return;
    if (messages.length > 0 && !forceRegenerate) return;

    setBriefingLoading(true);
    try {
      const body: Record<string, unknown> = {
        date: selectedDate.toISOString(),
        forceRegenerate,
      };

      if (locationRef.current) {
        body.lat = locationRef.current.lat;
        body.lon = locationRef.current.lon;
      }

      const response = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.message) {
          if (forceRegenerate) {
            // Replace the old briefing and add new one at the end (latest)
            setMessages((prev) => {
              // Remove the old briefing (same id) and add new one at end
              const filtered = prev.filter(m => m.id !== data.message.id);
              return [...filtered, data.message];
            });
          } else {
            setMessages([data.message]);
          }
        }
      }
    } catch (error) {
      console.error("Failed to generate briefing:", error);
    } finally {
      setBriefingLoading(false);
    }
  }, [selectedDate, isPastDate, messages.length]);

  // Auto-generate briefing for today with no messages
  useEffect(() => {
    if (!isPastDate && messages.length === 0 && !isLoading && isInitialized) {
      generateBriefing();
    }
  }, [generateBriefing, isPastDate, messages.length, isLoading, isInitialized]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (isPastDate) return;

      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        role: "user",
        content,
        date: selectedDate,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const chatBody: Record<string, unknown> = {
          message: content,
          date: toLocalDateString(selectedDate),
        };
        
        // Include location for AI context
        if (locationRef.current) {
          chatBody.location = {
            lat: locationRef.current.lat,
            lon: locationRef.current.lon,
            city: locationRef.current.city,
            country: locationRef.current.country,
          };
        }

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(chatBody),
        });

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        const data = await response.json();

        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== userMessage.id);
          return [...filtered, data.userMessage, data.assistantMessage];
        });

        const dateStr = toLocalDateString(selectedDate);
        if (!messageDates.includes(dateStr)) {
          setMessageDates((prev) => [dateStr, ...prev]);
        }
      } catch (error) {
        console.error("Failed to send message:", error);
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      } finally {
        setIsLoading(false);
      }
    },
    [selectedDate, messageDates, isPastDate]
  );

  const handleDateSelect = (date: Date) => {
    // Clear cache for new date
    sessionStorage.removeItem(STORAGE_KEYS.MESSAGES_CACHE);
    sessionStorage.removeItem(STORAGE_KEYS.LAST_FETCHED_DATE);
    setMessages([]);
    setSelectedDate(date);
    setShowCalendar(false);
  };

  const handleRegenerateBriefing = () => {
    generateBriefing(true);
  };

  return (
    <AppShell>
      <div className="h-screen flex flex-col">
        {/* Date selector header */}
        <div className="bg-card border-b border-border px-4 py-2 flex items-center justify-between shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCalendar(!showCalendar)}
            className="flex items-center gap-2 text-sm font-medium"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-4 h-4"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {formatDateDisplay(selectedDate)}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`w-3 h-3 transition-transform ${showCalendar ? "rotate-180" : ""}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </Button>

          <div className="flex items-center gap-2">
            {briefingLoading && (
              <span className="text-xs text-muted-foreground">
                Preparing your day...
              </span>
            )}
            {!isPastDate && !briefingLoading && messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRegenerateBriefing}
                className="text-xs text-muted-foreground hover:text-foreground"
                title="Regenerate today's briefing"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-4 h-4"
                >
                  <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
              </Button>
            )}
            {/* Theme toggle for mobile */}
            <div className="lg:hidden">
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Past date read-only banner */}
        {isPastDate && (
          <div className="bg-muted/50 border-b border-border px-4 py-2 text-center">
            <span className="text-sm text-muted-foreground">
              Viewing past conversation (read-only)
            </span>
          </div>
        )}

        {/* Late night mode indicator */}
        {isLateNight && !isPastDate && (
          <div className="bg-primary/10 border-b border-primary/20 px-4 py-1 text-center">
            <span className="text-xs text-primary">
              Late night mode - messages will be saved to today&apos;s chat
            </span>
          </div>
        )}

        {/* Calendar dropdown */}
        {showCalendar && (
          <div className="absolute top-14 left-4 lg:left-[calc(240px+1rem)] z-50 animate-in slide-in-from-top-2">
            <ChatCalendar
              selectedDate={selectedDate}
              onSelectDate={handleDateSelect}
              messageDates={messageDates}
            />
          </div>
        )}

        {showCalendar && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowCalendar(false)}
          />
        )}

        <div className="flex-1 overflow-hidden">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading || briefingLoading}
            disabled={isPastDate}
          />
        </div>
      </div>
    </AppShell>
  );
}
