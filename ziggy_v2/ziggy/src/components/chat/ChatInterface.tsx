"use client";

import { useRef, useEffect } from "react";
import { MessageBubble } from "./MessageBubble";
import { InputArea } from "./InputArea";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export function ChatInterface({
  messages,
  onSendMessage,
  isLoading,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4 shrink-0">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-lg">Z</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Ziggy</h1>
            <p className="text-sm text-muted-foreground">
              Your AI Assistant
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1">
        <div className="p-6 max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <WelcomeScreen />
          ) : (
            <>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {isLoading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <InputArea onSend={onSendMessage} isLoading={isLoading} />
    </div>
  );
}

function WelcomeScreen() {
  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
        <span className="text-white font-bold text-3xl">Z</span>
      </div>
      <h3 className="text-2xl font-semibold text-foreground mb-3">
        Welcome to Ziggy!
      </h3>
      <p className="text-muted-foreground max-w-md mx-auto leading-relaxed mb-8">
        I&apos;m your personal AI assistant. Tell me about your tasks, goals, or
        anything on your mind, and I&apos;ll help you stay organized.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
        <ExampleCard
          icon="📝"
          title="Track Tasks"
          example="I need to call the doctor and buy groceries"
        />
        <ExampleCard
          icon="🎯"
          title="Set Goals"
          example="Remind me to review the project by Friday"
        />
        <ExampleCard
          icon="🔄"
          title="Build Habits"
          example="I want to start meditating daily"
        />
        <ExampleCard
          icon="🏆"
          title="Mark Milestones"
          example="I got promoted at work today!"
        />
      </div>
    </div>
  );
}

function ExampleCard({
  icon,
  title,
  example,
}: {
  icon: string;
  title: string;
  example: string;
}) {
  return (
    <div className="bg-card p-4 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
      <h4 className="font-medium text-foreground mb-1">
        {icon} {title}
      </h4>
      <p className="text-sm text-muted-foreground">&quot;{example}&quot;</p>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xs">Z</span>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            Ziggy
          </span>
        </div>
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}
