"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "group flex w-full mb-2",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] relative rounded-2xl px-4 py-2.5",
          isUser
            ? "bg-primary/90 text-primary-foreground rounded-br-lg"
            : "bg-muted/40 border border-border/50 rounded-bl-lg"
        )}
      >
        <p
          className={cn(
            "text-sm leading-relaxed whitespace-pre-wrap",
            isUser ? "text-primary-foreground" : "text-foreground"
          )}
        >
          {message.content}
        </p>
        <p
          className={cn(
            "text-[10px] mt-1 transition-opacity",
            isUser
              ? "text-primary-foreground/50 text-right"
              : "text-muted-foreground/60 opacity-0 group-hover:opacity-100"
          )}
        >
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </motion.div>
  );
}
