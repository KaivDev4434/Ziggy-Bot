"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { BottomNav } from "@/components/BottomNav";
import { STORAGE_KEYS } from "@/lib/constants";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Load sidebar state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.SIDEBAR_OPEN);
    if (stored !== null) {
      setSidebarOpen(stored === "true");
    }
    setMounted(true);
  }, []);

  // Save sidebar state
  const handleToggle = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_OPEN, String(newState));
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
      {/* Mobile Header with Nav Drawer */}
      <MobileNav />

      {/* Desktop Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={handleToggle} />

      {/* Main Content - add top padding on mobile for fixed header */}
      <main className="flex-1 min-h-screen lg:pb-0 pb-16 pt-14 lg:pt-0">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
