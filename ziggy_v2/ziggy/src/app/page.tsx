"use client";

import { useState, useEffect, useCallback } from "react";
import { ChatInterface } from "@/components/chat";
import { BottomNav } from "@/components/BottomNav";

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load messages on mount
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch("/api/messages");
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages);
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      }
    };
    fetchMessages();
  }, []);

  const handleSendMessage = useCallback(async (content: string) => {
    // Optimistically add user message
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
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
    } catch (error) {
      console.error("Failed to send message:", error);
      // Remove the optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <main className="h-screen bg-background flex flex-col">
      <div className="flex-1 overflow-hidden pb-16">
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>
      <BottomNav />
    </main>
  );
}
