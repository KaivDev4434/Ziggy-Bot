"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AddHabitProps {
  onAdd: (name: string, frequency: string) => void;
}

export function AddHabit({ onAdd }: AddHabitProps) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim(), "daily");
      setName("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
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
    </form>
  );
}
