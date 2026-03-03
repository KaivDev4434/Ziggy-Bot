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
  disabled?: boolean;
}

export function ChatInterface({
  messages,
  onSendMessage,
  isLoading,
  disabled = false,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-8 max-w-3xl mx-auto">
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
      <InputArea onSend={onSendMessage} isLoading={isLoading} disabled={disabled} />
    </div>
  );
}

function WelcomeScreen() {
  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 bg-gradient-to-br from-primary/80 to-primary/40 rounded-full flex items-center justify-center mx-auto mb-6">
        <span className="text-white font-semibold text-2xl">Z</span>
      </div>
      <h3 className="text-xl font-medium text-foreground mb-2">
        Hi, I&apos;m Ziggy
      </h3>
      <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed mb-10 text-sm">
        Your personal assistant. Tell me about your day, tasks, or anything on your mind.
      </p>
      <div className="max-w-md mx-auto space-y-3">
        <SuggestionRow text="I need to call the doctor and buy groceries" />
        <SuggestionRow text="Remind me to review the project by Friday" />
        <SuggestionRow text="I want to start meditating daily" />
      </div>
    </div>
  );
}

function SuggestionRow({ text }: { text: string }) {
  return (
    <div className="text-sm text-muted-foreground/70 py-2 px-4 rounded-xl hover:bg-muted/50 transition-colors cursor-default">
      &ldquo;{text}&rdquo;
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-2">
      <div className="px-2 py-3">
        <div className="flex gap-1.5">
          <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}
