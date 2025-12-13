"use client";

import { useState, useEffect, useCallback } from "react";
import { ChatInterface } from "@/components/chat";
import { ChatCalendar } from "@/components/chat/ChatCalendar";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  role: string;
  content: string;
  date: Date;
  createdAt: Date;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageDates, setMessageDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [briefingLoading, setBriefingLoading] = useState(false);

  // Format date for display
  const formatDateDisplay = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(date);
    selected.setHours(0, 0, 0, 0);

    if (selected.getTime() === today.getTime()) {
      return "Today";
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (selected.getTime() === yesterday.getTime()) {
      return "Yesterday";
    }

    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // Load messages for selected date
  const fetchMessages = useCallback(async () => {
    try {
      const dateStr = selectedDate.toISOString().split("T")[0];
      const response = await fetch(`/api/messages?date=${dateStr}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
        setMessageDates(data.messageDates || []);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Generate daily briefing for new day
  const generateBriefing = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = selectedDate.getTime() === today.getTime();

    // Only generate briefing for today and if no messages exist
    if (!isToday || messages.length > 0) return;

    setBriefingLoading(true);
    try {
      const response = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate.toISOString() }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.message) {
          setMessages([data.message]);
        }
      }
    } catch (error) {
      console.error("Failed to generate briefing:", error);
    } finally {
      setBriefingLoading(false);
    }
  }, [selectedDate, messages.length]);

  useEffect(() => {
    // Auto-generate briefing when switching to a new day with no messages
    if (messages.length === 0 && !isLoading) {
      generateBriefing();
    }
  }, [generateBriefing, messages.length, isLoading]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      // Optimistically add user message
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
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            date: selectedDate.toISOString(),
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        const data = await response.json();

        // Update with actual messages from server
        setMessages((prev) => {
          // Remove the temp message and add the real ones
          const filtered = prev.filter((m) => m.id !== userMessage.id);
          return [...filtered, data.userMessage, data.assistantMessage];
        });

        // Update message dates if this is a new day
        const dateStr = selectedDate.toISOString().split("T")[0];
        if (!messageDates.includes(dateStr)) {
          setMessageDates((prev) => [dateStr, ...prev]);
        }
      } catch (error) {
        console.error("Failed to send message:", error);
        // Remove the optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      } finally {
        setIsLoading(false);
      }
    },
    [selectedDate, messageDates]
  );

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setShowCalendar(false);
  };

  return (
    <main className="h-screen bg-background flex flex-col">
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
        {briefingLoading && (
          <span className="text-xs text-muted-foreground">
            Preparing your day...
          </span>
        )}
      </div>

      {/* Calendar dropdown */}
      {showCalendar && (
        <div className="absolute top-14 left-4 z-50 animate-in slide-in-from-top-2">
          <ChatCalendar
            selectedDate={selectedDate}
            onSelectDate={handleDateSelect}
            messageDates={messageDates}
          />
        </div>
      )}

      {/* Click outside to close calendar */}
      {showCalendar && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowCalendar(false)}
        />
      )}

      <div className="flex-1 overflow-hidden pb-16">
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading || briefingLoading}
        />
      </div>
      <BottomNav />
    </main>
  );
}
