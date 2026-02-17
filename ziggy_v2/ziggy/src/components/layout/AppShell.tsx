"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "@/components/BottomNav";

const SIDEBAR_KEY = "ziggy_sidebar_open";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Load sidebar state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_KEY);
    if (stored !== null) {
      setSidebarOpen(stored === "true");
    }
    setMounted(true);
  }, []);

  // Save sidebar state
  const handleToggle = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    localStorage.setItem(SIDEBAR_KEY, String(newState));
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={handleToggle} />

      {/* Main Content */}
      <main className="flex-1 min-h-screen lg:pb-0 pb-16">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
