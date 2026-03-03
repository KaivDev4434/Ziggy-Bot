"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchResult {
  type: "message" | "todo" | "habit" | "memory";
  id: string;
  title: string;
  snippet: string;
  date?: string;
  metadata?: Record<string, unknown>;
}

interface SearchResults {
  messages: SearchResult[];
  todos: SearchResult[];
  habits: SearchResult[];
  memories: SearchResult[];
  total: number;
}

const typeIcons: Record<string, string> = {
  message: "💬",
  todo: "✓",
  habit: "🔄",
  memory: "🧠",
};

const typeLabels: Record<string, string> = {
  message: "Messages",
  todo: "Tasks",
  habit: "Habits",
  memory: "Memories",
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const debouncedQuery = useDebounce(query, 300);

  // Handle keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Search when query changes
  const search = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setResults(null);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    search(debouncedQuery);
  }, [debouncedQuery, search]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    setResults(null);

    switch (result.type) {
      case "message":
        // Navigate to chat with date
        if (result.date) {
          const date = new Date(result.date).toISOString().split("T")[0];
          router.push(`/?date=${date}`);
        } else {
          router.push("/");
        }
        break;
      case "todo":
        router.push("/todos");
        break;
      case "habit":
        router.push("/habits");
        break;
      case "memory":
        // Memories don't have a dedicated page, go to dashboard
        router.push("/dashboard");
        break;
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setQuery("");
      setResults(null);
    }
  };

  // Quick actions when no search query
  const quickActions = [
    { label: "Go to Chat", icon: "💬", action: () => router.push("/") },
    { label: "Go to Tasks", icon: "✓", action: () => router.push("/todos") },
    { label: "Go to Habits", icon: "🔄", action: () => router.push("/habits") },
    { label: "Go to Dashboard", icon: "📊", action: () => router.push("/dashboard") },
  ];

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <CommandInput
        placeholder="Search messages, tasks, habits..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {isLoading && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Searching...
          </div>
        )}

        {!isLoading && !results && query.length < 2 && (
          <>
            <CommandEmpty>
              Type at least 2 characters to search
            </CommandEmpty>
            <CommandGroup heading="Quick Actions">
              {quickActions.map((action) => (
                <CommandItem
                  key={action.label}
                  onSelect={() => {
                    action.action();
                    setOpen(false);
                  }}
                >
                  <span className="mr-2">{action.icon}</span>
                  {action.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {!isLoading && results && results.total === 0 && (
          <CommandEmpty>No results found for &quot;{query}&quot;</CommandEmpty>
        )}

        {!isLoading && results && results.total > 0 && (
          <>
            {results.messages.length > 0 && (
              <>
                <CommandGroup heading={typeLabels.message}>
                  {results.messages.map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result)}
                    >
                      <span className="mr-2">{typeIcons.message}</span>
                      <div className="flex flex-col">
                        <span className="font-medium">{result.title}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                          {result.snippet}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {results.todos.length > 0 && (
              <>
                <CommandGroup heading={typeLabels.todo}>
                  {results.todos.map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result)}
                    >
                      <span className="mr-2">{typeIcons.todo}</span>
                      <div className="flex flex-col">
                        <span className="font-medium">{result.title}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                          {result.snippet}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {results.habits.length > 0 && (
              <>
                <CommandGroup heading={typeLabels.habit}>
                  {results.habits.map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result)}
                    >
                      <span className="mr-2">{typeIcons.habit}</span>
                      <div className="flex flex-col">
                        <span className="font-medium">{result.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {result.snippet}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {results.memories.length > 0 && (
              <CommandGroup heading={typeLabels.memory}>
                {results.memories.map((result) => (
                  <CommandItem
                    key={result.id}
                    onSelect={() => handleSelect(result)}
                  >
                    <span className="mr-2">{typeIcons.memory}</span>
                    <div className="flex flex-col">
                      <span className="font-medium capitalize">{result.title}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                        {result.snippet}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
